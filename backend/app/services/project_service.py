from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models.project import Project, Stage, Task
from app.schemas.project import ProjectCreate, ProjectUpdate, StageCreate


class ProjectService:
    @staticmethod
    def create_project(db: Session, project_in: ProjectCreate) -> Project:
        project = Project(
            name=project_in.name,
            description=project_in.description,
            deadline=project_in.deadline,
            team_id=project_in.team_id
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def get_project(db: Session, project_id: int) -> Optional[Project]:
        return db.query(Project).filter(Project.id == project_id).first()

    @staticmethod
    def get_team_projects(db: Session, team_id: int) -> List[Project]:
        return db.query(Project).filter(Project.team_id == team_id).all()

    # Метод для сохранения всей структуры проекта (этапы, задачи)
    # В реальном приложении лучше обновлять точечно, но для сохранения "save" кнопки пойдет полная перезапись
    @staticmethod
    def update_project_stages(db: Session, project_id: int, stages_in: List[StageCreate]) -> List[Stage]:
        try:
            project = ProjectService.get_project(db, project_id)
            if not project:
                raise ValueError(f"Project with id {project_id} not found")

            # Удаляем старые этапы (каскадно удалятся задачи)
            project.stages = []
            db.commit() # Clear

            # Создаем маппинг: позиция в массиве -> новый ID этапа
            new_stages = []
            index_to_stage_id = {}  # Маппинг: индекс этапа -> новый ID этапа
            
            # Создаем все этапы сначала
            for idx, stage_data in enumerate(stages_in):
                stage = Stage(
                    name=stage_data.name,
                    duration=stage_data.duration,
                    project_id=project_id,
                    is_completed=stage_data.is_completed,
                    responsibles=stage_data.responsibles or [],
                    feedback=stage_data.feedback,
                    dependencies=[]  # Временно пустой
                )
                db.add(stage)
                db.commit()
                db.refresh(stage)
                new_stages.append(stage)
                index_to_stage_id[idx] = stage.id
            
            # Создаем глобальный маппинг для всех задач: (stage_index, task_index) -> новый ID задачи
            index_to_task_id_global = {}  # Маппинг: (индекс этапа, индекс задачи) -> новый ID задачи
            
            # Создаем все задачи во всех этапах
            for stage_idx, (stage_data, stage) in enumerate(zip(stages_in, new_stages)):
                tasks_list = stage_data.tasks if stage_data.tasks is not None else []
                for task_idx, task_data in enumerate(tasks_list):
                    task = Task(
                        name=task_data.name,
                        duration=task_data.duration,
                        stage_id=stage.id,
                        is_completed=task_data.is_completed,
                        responsibles=task_data.responsibles or [],
                        feedback=task_data.feedback,
                        dependencies=[]  # Временно пустой
                    )
                    db.add(task)
                    db.commit()
                    db.refresh(task)
                    index_to_task_id_global[(stage_idx, task_idx)] = task.id
                    stage.tasks.append(task)
            
            # Обновляем зависимости этапов: маппим индексы на новые ID
            for idx, (stage_data, stage) in enumerate(zip(stages_in, new_stages)):
                updated_deps = []
                deps = stage_data.dependencies if stage_data.dependencies is not None else []
                if deps:
                    for dep_index in deps:
                        # dep_index - это позиция этапа в массиве
                        if isinstance(dep_index, int) and 0 <= dep_index < len(new_stages):
                            updated_deps.append(index_to_stage_id[dep_index])
                stage.dependencies = updated_deps
                flag_modified(stage, "dependencies")
            
            # Обновляем зависимости задач: маппим индексы на новые ID
            # ВАЖНО: Нужно перебрать задачи в правильном порядке из исходного массива
            for stage_idx, (stage_data, stage) in enumerate(zip(stages_in, new_stages)):
                tasks_list = stage_data.tasks if stage_data.tasks is not None else []
                # Получаем все задачи этапа из базы в виде словаря по ID
                stage_tasks_dict = {task.id: task for task in stage.tasks}
                
                # Перебираем задачи в том же порядке, в котором они были в исходном массиве
                for task_idx, task_data in enumerate(tasks_list):
                    # Получаем ID задачи из маппинга
                    task_id = index_to_task_id_global.get((stage_idx, task_idx))
                    if not task_id:
                        continue
                    # Получаем объект задачи из словаря
                    task = stage_tasks_dict.get(task_id)
                    if not task:
                        continue
                    
                    updated_task_deps = []
                    task_deps = task_data.dependencies if task_data.dependencies is not None else []
                    if task_deps:
                        for dep_value in task_deps:
                            if isinstance(dep_value, int):
                                if dep_value >= 0:
                                    # Положительное число: stage_index * 10000 + task_index
                                    # Извлекаем stage_index и task_index
                                    dep_stage_idx = dep_value // 10000
                                    dep_task_idx = dep_value % 10000
                                    task_key = (dep_stage_idx, dep_task_idx)
                                    if task_key in index_to_task_id_global:
                                        updated_task_deps.append(index_to_task_id_global[task_key])
                                else:
                                    # Отрицательное число: это этап, используем -(stage_index + 1)
                                    stage_dep_index = -(dep_value + 1)
                                    if 0 <= stage_dep_index < len(new_stages):
                                        updated_task_deps.append(index_to_stage_id[stage_dep_index])
                    
                    task.dependencies = updated_task_deps
                    flag_modified(task, "dependencies")
            
            # Коммитим все изменения зависимостей
            db.commit()
            
            # Важно: возвращаем этапы в том же порядке, в котором они были созданы (по порядку в stages_in)
            # А задачи в каждом этапе - в том же порядке, в котором они были созданы
            # Это гарантирует, что порядок на фронтенде останется таким же
            ordered_stages = []
            for stage_idx in range(len(stages_in)):
                stage_id = index_to_stage_id[stage_idx]
                stage = next((s for s in new_stages if s.id == stage_id), None)
                if stage:
                    # Создаем маппинг: task_id -> позиция в исходном массиве для сортировки
                    tasks_order = {}
                    for (s_idx, t_idx), task_id in index_to_task_id_global.items():
                        if s_idx == stage_idx:
                            tasks_order[task_id] = t_idx
                    
                    # Обновляем объекты после изменений
                    db.refresh(stage)
                    # После refresh tasks могут быть в неправильном порядке, поэтому сортируем их
                    # Сортируем задачи по порядку создания (по их позиции в исходном массиве)
                    stage.tasks.sort(key=lambda t: tasks_order.get(t.id, 999))
                    # Обновляем каждую задачу после сортировки
                    for task in stage.tasks:
                        db.refresh(task)
                    
                    ordered_stages.append(stage)
            
            return ordered_stages
        except Exception as e:
            db.rollback()
            print(f"Error in update_project_stages: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

    @staticmethod
    def update_project(db: Session, project_id: int, project_update: ProjectUpdate) -> Optional[Project]:
        project = ProjectService.get_project(db, project_id)
        if not project:
            return None
        
        project.name = project_update.name
        project.description = project_update.description
        project.deadline = project_update.deadline
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def delete_project(db: Session, project_id: int) -> bool:
        project = ProjectService.get_project(db, project_id)
        if not project:
            return False
        
        # Stages and tasks will be deleted cascade (see Project model: cascade="all, delete-orphan")
        db.delete(project)
        db.commit()
        return True


