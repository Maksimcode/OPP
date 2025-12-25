import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { CreateStagePayload, projectsApi } from "../api/projects";
import { teamsApi } from "../api/teams";
import { Header } from "../components/Header";
import { StageTaskFormValues, StageTaskModal } from "../components/StageTaskModal";

interface ProjectDetails {
  id: number;
  name: string;
  deadline: string;
  creationDate: string;
  description?: string;
}

interface LocationState {
  project?: ProjectDetails;
  teamName?: string;
}

interface Task {
  id: number;
  name: string;
  responsibles: string[];
  duration: number; // Количество дней
  startDate?: string; // Дата начала (вычисляется автоматически)
  endDate?: string; // Дата окончания (вычисляется автоматически)
  feedback?: string;
  isCompleted: boolean;
  dependencies?: number[]; // IDs of tasks/stages this task depends on
}

interface Stage extends Task {
  tasks: Task[];
}

interface ModalConfig {
  isOpen: boolean;
  entity: "stage" | "task";
  parentStageId?: number;
  editingStageId?: number;
  editingTaskId?: number;
  initialValues?: StageTaskFormValues;
}

const getDatesBetween = (start: Date, end: Date) => {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const formatWeekday = (date: Date) => date.toLocaleDateString("ru-RU", { weekday: "short" }).replace(".", "");

const dayMs = 24 * 60 * 60 * 1000;

const renderResponsibles = (people: string[] = []) => {
  if (!people.length) {
    return <span className="responsible-chip ghost">—</span>;
  }

  return (
    <div style={{ 
      display: "flex", 
      gap: "0.25rem", 
      overflow: "hidden", 
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      maxWidth: "100%"
    }}>
      {people.map((person) => (
        <span key={person} className="responsible-chip" title={person}>
          {person}
        </span>
      ))}
    </div>
  );
};

const getBarPosition = (startDate: Date | undefined, endDate: Date | undefined, projectStart: Date, totalColumns: number) => {
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  if (!startDate || !endDate) {
    return { columnStart: 1, span: 1 };
  }
  
  const s = new Date(startDate);
  s.setHours(0, 0, 0, 0);
  const e = new Date(endDate);
  e.setHours(23, 59, 59, 999);
  const ps = new Date(projectStart);
  ps.setHours(0, 0, 0, 0);

  let startIndex = Math.round((s.getTime() - ps.getTime()) / dayMs);
  let endIndex = Math.floor((e.getTime() - ps.getTime()) / dayMs);
  
  startIndex = clamp(startIndex, 0, totalColumns - 1);
  endIndex = clamp(Math.max(startIndex, endIndex), startIndex, totalColumns - 1);
  
  return {
    columnStart: startIndex + 1,
    span: Math.max(1, endIndex - startIndex + 1)
  };
};

export const ProjectPage = () => {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;

  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(state?.project ?? null);
  const [teamName, setTeamName] = useState<string>(state?.teamName ?? `Команда #${teamId}`);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false, entity: "stage" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [justSaved, setJustSaved] = useState(false); // Флаг, что только что сохранили
  const isInitialMount = useRef(true);
  const stagesLoadedRef = useRef(false);
  const lastSavedStagesRef = useRef<string>(""); // Реф для отслеживания изменений данных
  const ganttTableRef = useRef<HTMLDivElement | null>(null);
  const [depsSvgSize, setDepsSvgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [depsPaths, setDepsPaths] = useState<Array<{ key: string; d: string; stroke: string; opacity: number; strokeWidth: number }>>([]);
  const [hoveredEntity, setHoveredEntity] = useState<{ id: number; type: "stage" | "task" } | null>(null);

  // Функция для проверки, есть ли зависимость (прямая или косвенная)
  // Используется для предотвращения циклических зависимостей в UI
  const isDependentOn = useCallback((targetId: number, sourceId: number, entityType: "stage" | "task", currentStageId?: number): boolean => {
    if (entityType === "stage") {
      const sourceStage = stages.find(s => s.id === sourceId);
      if (!sourceStage || !sourceStage.dependencies) return false;
      if (sourceStage.dependencies.includes(targetId)) return true;
      return sourceStage.dependencies.some(depId => isDependentOn(targetId, depId, "stage"));
    } else {
      const stage = stages.find(s => s.id === currentStageId);
      if (!stage) return false;
      const sourceTask = stage.tasks.find(t => t.id === sourceId);
      if (!sourceTask || !sourceTask.dependencies) return false;
      if (sourceTask.dependencies.includes(targetId)) return true;
      return sourceTask.dependencies.some(depId => isDependentOn(targetId, depId, "task", currentStageId));
    }
  }, [stages]);

  // Вычисляем доступные сущности для зависимостей в зависимости от того, что редактируем
  const allAvailableEntities = useMemo(() => {
    if (!modalConfig.isOpen) return [];

    if (modalConfig.entity === "stage") {
      // Для этапа доступны только другие этапы
      return stages
        .map(s => {
          const isSelf = s.id === modalConfig.editingStageId;
          const causesCircular = modalConfig.editingStageId ? isDependentOn(modalConfig.editingStageId, s.id, "stage") : false;
          
          return { 
            id: s.id, 
            name: s.name, 
            type: "stage" as const,
            disabled: isSelf || causesCircular
          };
        });
    } else {
      // Для задачи доступны только другие задачи в ТОМ ЖЕ этапе
      const currentStage = stages.find(s => s.id === modalConfig.parentStageId);
      if (!currentStage) return [];

      return currentStage.tasks
        .map(t => {
          const isSelf = t.id === modalConfig.editingTaskId;
          const causesCircular = modalConfig.editingTaskId ? isDependentOn(modalConfig.editingTaskId, t.id, "task", modalConfig.parentStageId) : false;

          return { 
            id: t.id, 
            name: t.name, 
            type: "task" as const,
            disabled: isSelf || causesCircular
          };
        });
    }
  }, [modalConfig.isOpen, modalConfig.entity, modalConfig.editingStageId, modalConfig.editingTaskId, modalConfig.parentStageId, stages, isDependentOn]);

  const creationDate = useMemo(() => {
    const date = projectDetails ? new Date(projectDetails.creationDate) : new Date();
    date.setHours(0, 0, 0, 0); // Всегда нормализуем к началу дня
    return date;
  }, [projectDetails]);
  const deadlineDate = useMemo(() => {
    const date = projectDetails ? new Date(projectDetails.deadline) : new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }, [projectDetails]);

  const dateRange = useMemo(() => {
    const start = new Date(creationDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(deadlineDate);
    end.setHours(23, 59, 59, 999);
    
    if (end < start) {
      return [start];
    }
    return getDatesBetween(start, end);
  }, [creationDate, deadlineDate]);

  const durationDays = dateRange.length;
  const gridTemplate = `320px 200px repeat(${dateRange.length}, 70px)`;

  const isSameLocalDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  // Функция для переупорядочивания этапов: зависимые этапы должны быть ниже
  // Если этап A зависит от этапа B, то этап B будет выше (раньше) в списке
  // Сохраняет стабильный порядок для этапов без зависимостей или с одинаковыми зависимостями
  const reorderStagesByDependencies = (stagesList: Stage[], explicitOrder?: Map<number, number>): Stage[] => {
    if (stagesList.length === 0) return stagesList;
    
    // Используем явно переданный порядок или создаем из текущего массива
    const originalOrder = explicitOrder || new Map<number, number>();
    if (!explicitOrder) {
      stagesList.forEach((stage, index) => {
        originalOrder.set(stage.id, index);
      });
    }
    
    const reordered: Stage[] = [];
    const added = new Set<number>();
    const processing = new Set<number>(); // Защита от циклических зависимостей
    
    const addStage = (stageId: number) => {
      if (added.has(stageId)) return; // Уже добавлен
      if (processing.has(stageId)) {
        // Обнаружена циклическая зависимость - пропускаем эту зависимость
        console.warn(`Circular dependency detected for stage ${stageId}`);
        return;
      }
      
      const stage = stagesList.find((s) => s.id === stageId);
      if (!stage) return;
      
      processing.add(stageId); // Помечаем как обрабатываемый
      
      // Сначала добавляем все зависимости этого этапа (они должны быть выше)
      if (stage.dependencies && stage.dependencies.length > 0) {
        // Сортируем зависимости по исходному порядку для стабильности
        const sortedDeps = [...stage.dependencies]
          .filter(depId => depId !== stageId) // Защита от самозависимости
          .sort((a, b) => (originalOrder.get(a) || 0) - (originalOrder.get(b) || 0));
        
        for (const depId of sortedDeps) {
          addStage(depId);
        }
      }
      
      processing.delete(stageId); // Убираем из обрабатываемых
      
      // Затем добавляем сам этап (он будет ниже зависимостей)
      reordered.push(stage);
      added.add(stageId);
    };
    
    // Начинаем с этапов без зависимостей, затем добавляем остальные
    // Это гарантирует, что этапы без зависимостей будут вверху
    const stagesWithoutDeps = stagesList.filter((s) => !s.dependencies || s.dependencies.length === 0);
    // Сортируем по исходному порядку для стабильности
    stagesWithoutDeps.sort((a, b) => (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0));
    
    const stagesWithDeps = stagesList.filter((s) => s.dependencies && s.dependencies.length > 0);
    // Сортируем по исходному порядку для стабильности
    stagesWithDeps.sort((a, b) => (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0));
    
    // Сначала обрабатываем этапы без зависимостей
    for (const stage of stagesWithoutDeps) {
      if (!added.has(stage.id)) {
        addStage(stage.id);
      }
    }
    
    // Затем обрабатываем этапы с зависимостями
    for (const stage of stagesWithDeps) {
      if (!added.has(stage.id)) {
        addStage(stage.id);
      }
    }
    
    // На случай, если какие-то этапы не были обработаны (не должны быть, но на всякий случай)
    const remaining = stagesList.filter(s => !added.has(s.id));
    remaining.sort((a, b) => (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0));
    for (const stage of remaining) {
      addStage(stage.id);
    }
    
    return reordered;
  };

  // Функция для переупорядочивания задач внутри этапа
  // Сохраняет стабильный порядок для задач без зависимостей или с одинаковыми зависимостями
  const reorderTasksByDependencies = (tasks: Task[], explicitOrder?: Map<number, number>): Task[] => {
    if (tasks.length === 0) return tasks;
    
    // Используем явно переданный порядок или создаем из текущего массива
    const originalOrder = explicitOrder || new Map<number, number>();
    if (!explicitOrder) {
      tasks.forEach((task, index) => {
        originalOrder.set(task.id, index);
      });
    }
    
    const reordered: Task[] = [];
    const added = new Set<number>();
    const processing = new Set<number>(); // Защита от циклических зависимостей
    
    // Вспомогательная функция для сравнения зависимостей
    const getDependencyKey = (task: Task): string => {
      if (!task.dependencies || task.dependencies.length === 0) {
        return ''; // Задачи без зависимостей
      }
      // Сортируем зависимости для стабильности
      return [...task.dependencies].sort((a, b) => a - b).join(',');
    };
    
    // Группируем задачи по их зависимостям для стабильного порядка
    const tasksByDeps = new Map<string, Task[]>();
    tasks.forEach(task => {
      const key = getDependencyKey(task);
      if (!tasksByDeps.has(key)) {
        tasksByDeps.set(key, []);
      }
      tasksByDeps.get(key)!.push(task);
    });
    
    // Сортируем задачи в каждой группе по исходному порядку
    tasksByDeps.forEach(group => {
      group.sort((a, b) => (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0));
    });
    
    const addTask = (taskId: number) => {
      if (added.has(taskId)) return; // Уже добавлена
      if (processing.has(taskId)) {
        // Обнаружена циклическая зависимость - пропускаем эту зависимость
        console.warn(`Circular dependency detected for task ${taskId}`);
        return;
      }
      
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      
      processing.add(taskId); // Помечаем как обрабатываемую
      
      // Сначала добавляем все зависимости этой задачи
      // Зависимости могут быть как задачами, так и этапами
      if (task.dependencies && task.dependencies.length > 0) {
        // Получаем задачи-зависимости в стабильном порядке
        const taskDeps = task.dependencies
          .map(depId => tasks.find((t) => t.id === depId))
          .filter((t): t is Task => t !== undefined)
          .sort((a, b) => (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0));
        
        for (const depTask of taskDeps) {
          if (depTask.id !== taskId) { // Защита от самозависимости
            addTask(depTask.id);
          }
        }
        // Если это этап (depId не найден в tasks), пропускаем - этапы обрабатываются отдельно
      }
      
      processing.delete(taskId); // Убираем из обрабатываемых
      
      // Затем добавляем саму задачу
      reordered.push(task);
      added.add(taskId);
    };
    
    // Добавляем все задачи в правильном порядке, сохраняя исходный порядок для задач без зависимостей
    // Сначала обрабатываем задачи без зависимостей в исходном порядке
    const tasksWithoutDeps = tasks.filter(t => !t.dependencies || t.dependencies.length === 0);
    tasksWithoutDeps.sort((a, b) => (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0));
    for (const task of tasksWithoutDeps) {
      if (!added.has(task.id)) {
        addTask(task.id);
      }
    }
    
    // Затем обрабатываем задачи с зависимостями в исходном порядке
    const tasksWithDeps = tasks.filter(t => t.dependencies && t.dependencies.length > 0);
    tasksWithDeps.sort((a, b) => (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0));
    for (const task of tasksWithDeps) {
      if (!added.has(task.id)) {
        addTask(task.id);
      }
    }
    
    return reordered;
  };

  // Функция для пересчета дат на основе зависимостей (реверсивная диаграмма Ганта)
  const recalculateDates = useCallback((stagesList: Stage[]): Stage[] => {
    const updatedStages = stagesList.map((stage) => ({
      ...stage,
      tasks: stage.tasks.map((task) => ({ ...task }))
    }));
    
    const projectDeadline = new Date(deadlineDate);
    projectDeadline.setHours(23, 59, 59, 999);
    
    const processed = new Set<number>();
    const processingStages = new Set<number>(); // Защита от циклических зависимостей для этапов
    
    const getStartDate = (entity: Stage | Task): Date => 
      entity.startDate ? new Date(entity.startDate) : new Date(creationDate);
    
    const getEndDate = (entity: Stage | Task): Date => 
      entity.endDate ? new Date(entity.endDate) : new Date(creationDate);
    
    const processStage = (stage: Stage): void => {
      if (processed.has(stage.id)) return;
      if (processingStages.has(stage.id)) {
        // Обнаружена циклическая зависимость
        console.warn(`Circular dependency detected for stage ${stage.id} in recalculateDates`);
        return;
      }
      
      processingStages.add(stage.id);
      
      let minDependentStartDate: Date | null = null;
      
      // Ищем все этапы, которые зависят от этого этапа
      for (const otherStage of updatedStages) {
        if (otherStage.id !== stage.id && otherStage.dependencies?.includes(stage.id)) {
          processStage(otherStage);
          const dependentStart = getStartDate(otherStage);
          if (!minDependentStartDate || dependentStart < minDependentStartDate) {
            minDependentStartDate = new Date(dependentStart);
          }
        }
      }
      
      let stageEndDate: Date;
      if (minDependentStartDate) {
        stageEndDate = new Date(minDependentStartDate);
        stageEndDate.setDate(stageEndDate.getDate() - 1);
        stageEndDate.setHours(23, 59, 59, 999);
      } else {
        stageEndDate = new Date(projectDeadline);
      }
      
      const stageStartDate = new Date(stageEndDate);
      stageStartDate.setDate(stageStartDate.getDate() - stage.duration + 1);
      stageStartDate.setHours(0, 0, 0, 0);
      
      stage.startDate = stageStartDate.toISOString();
      stage.endDate = stageEndDate.toISOString();
      
      processingStages.delete(stage.id);
      
      const taskProcessed = new Set<number>();
      const processingTasks = new Set<number>(); // Защита от циклических зависимостей для задач
      
      const processTask = (task: Task) => {
        if (taskProcessed.has(task.id)) return;
        if (processingTasks.has(task.id)) {
          // Обнаружена циклическая зависимость
          console.warn(`Circular dependency detected for task ${task.id} in recalculateDates`);
          return;
        }
        
        processingTasks.add(task.id);
        
        let minDependentTaskStart: Date | null = null;
        
        for (const otherTask of stage.tasks) {
          if (otherTask.id !== task.id && otherTask.dependencies?.includes(task.id)) {
            processTask(otherTask);
            const dependentStart = getStartDate(otherTask);
            if (!minDependentTaskStart || dependentStart < minDependentTaskStart) {
              minDependentTaskStart = new Date(dependentStart);
            }
          }
        }
        
        let taskEndDate: Date;
        if (minDependentTaskStart) {
          taskEndDate = new Date(minDependentTaskStart);
          taskEndDate.setDate(taskEndDate.getDate() - 1);
          taskEndDate.setHours(23, 59, 59, 999);
        } else {
          taskEndDate = new Date(stageEndDate);
        }
        
        const taskStartDate = new Date(taskEndDate);
        taskStartDate.setDate(taskStartDate.getDate() - task.duration + 1);
        taskStartDate.setHours(0, 0, 0, 0);
        
        task.startDate = taskStartDate.toISOString();
        task.endDate = taskEndDate.toISOString();
        
        processingTasks.delete(task.id);
        taskProcessed.add(task.id);
      };
      
      for (const task of stage.tasks) {
        processTask(task);
      }
      
      processed.add(stage.id);
    };
    
    const stagesWithoutDeps = updatedStages.filter(
      (s) => !s.dependencies || s.dependencies.length === 0
    );
    
    for (const stage of stagesWithoutDeps) {
      processStage(stage);
    }
    
    for (const stage of updatedStages) {
      if (!processed.has(stage.id)) {
        processStage(stage);
      }
    }
    
    return updatedStages;
  }, [creationDate, deadlineDate]);

  useEffect(() => {
    const loadAllData = async () => {
      if (!projectId || !teamId) return;
      try {
        setLoading(true);
        
        // Загружаем данные проекта (включая этапы)
        const apiProject = await projectsApi.getOne(Number(projectId));
        setProjectDetails({
            id: apiProject.id,
            name: apiProject.name,
            deadline: apiProject.deadline,
            creationDate: apiProject.created_at,
            description: apiProject.description
        });

        // Маппинг этапов и задач
        if (apiProject.stages) {
            // Логирование для отладки
            console.log("Loaded stages from API:", JSON.stringify(apiProject.stages, null, 2));
            
            const mappedStages: Stage[] = apiProject.stages.map(s => ({
                id: s.id,
                name: s.name,
                duration: s.duration,
                isCompleted: s.is_completed,
                responsibles: s.responsibles || [],
                feedback: s.feedback,
                dependencies: Array.isArray(s.dependencies) ? s.dependencies : (s.dependencies ? [s.dependencies] : []), // Гарантируем, что это массив
                tasks: s.tasks.map(t => ({
                    id: t.id,
                    name: t.name,
                    duration: t.duration,
                    isCompleted: t.is_completed,
                    responsibles: t.responsibles || [],
                    feedback: t.feedback,
                    dependencies: Array.isArray(t.dependencies) ? t.dependencies : (t.dependencies ? [t.dependencies] : []) // Гарантируем, что это массив
                }))
            }));
            
            // НЕ применяем переупорядочивание при загрузке - порядок уже правильный с бэкенда
            // Пересчитываем даты после загрузки
            const withDates = recalculateDates(mappedStages);
            setStages(withDates);
        }

        // Загружаем участников команды
        const teamData = await teamsApi.getOne(Number(teamId));
        setTeamName(teamData.name);
        if (teamData.members) {
            setTeamMembers(teamData.members.map(m => m.full_name));
        }

        // Помечаем, что начальные данные загружены
        stagesLoadedRef.current = true;

      } catch (error) {
        console.error("Failed to load project data", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, teamId]); // recalculateDates removed from deps to avoid loop

  // Эффект для пересчета дат при изменении метаданных проекта или списка этапов
  // НЕ срабатывает после сохранения, чтобы не ломать порядок
  useEffect(() => {
      // Если только что сохранили, не делаем ничего - порядок уже правильный
      if (justSaved) {
        return;
      }
      
      if (stages.length > 0 && projectDetails && loading === false) {
          // Пересчитываем даты только если у нас есть этапы и информация о проекте
          // И только при первой загрузке (когда loading становится false)
          // Проверяем, нужно ли пересчитывать - если у этапов нет startDate/endDate или они устарели
          const needsRecalculation = stages.some(stage => 
            !stage.startDate || !stage.endDate || 
            stage.tasks.some(task => !task.startDate || !task.endDate)
          );
          
          if (needsRecalculation) {
            setStages(prev => recalculateDates(prev));
          }
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineDate, creationDate, projectDetails, loading, justSaved]); // When dates, project details, loading state, or justSaved changes

  const handleSaveProject = useCallback(async () => {
    if (!projectId) return;
    try {
      setSaving(true);
      setSaveStatus("saving");
      
      const currentStagesJson = JSON.stringify(stages);
      
      // Map local stages to API payload
      const stageIdToIndex = new Map<number, number>();
      stages.forEach((stage, index) => {
        stageIdToIndex.set(stage.id, index);
      });
      
      const taskIdToIndex = new Map<number, { stageIndex: number; taskIndex: number }>();
      stages.forEach((stage, stageIndex) => {
        stage.tasks.forEach((task, taskIndex) => {
          taskIdToIndex.set(task.id, { stageIndex, taskIndex });
        });
      });
      
      const payload: CreateStagePayload[] = stages.map((s, stageIndex) => ({
        name: s.name,
        duration: s.duration,
        is_completed: s.isCompleted,
        responsibles: s.responsibles || [],
        feedback: s.feedback,
        dependencies: (s.dependencies || []).map(depId => stageIdToIndex.get(depId) ?? -1).filter(idx => idx !== -1),
        tasks: s.tasks.map((t, taskIndex) => ({
            name: t.name,
            duration: t.duration,
            is_completed: t.isCompleted,
            responsibles: t.responsibles || [],
            feedback: t.feedback,
            dependencies: (t.dependencies || []).map(depId => {
              const taskInfo = taskIdToIndex.get(depId);
              if (taskInfo) {
                return taskInfo.stageIndex * 10000 + taskInfo.taskIndex;
              }
              const stageDepIndex = stageIdToIndex.get(depId);
              if (stageDepIndex !== undefined) {
                return -(stageDepIndex + 1);
              }
              return -999999;
            }).filter(idx => idx !== -999999)
        }))
      }));

      await projectsApi.updateStages(Number(projectId), payload);
      
      setSaveStatus("saved");
      lastSavedStagesRef.current = currentStagesJson;
      
      setTimeout(() => setSaveStatus("idle"), 3000);
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
      }, 2000);
      
    } catch (error: any) {
      console.error("Failed to save project", error);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }, [projectId, stages]);

  // Эффект автосохранения
  useEffect(() => {
    if (loading) return;
    
    // Ждем, пока данные загрузятся первый раз из API
    if (!stagesLoadedRef.current) return;

    const currentStagesJson = JSON.stringify(stages);
    
    // Если это самый первый проход после загрузки - запоминаем состояние и выходим
    if (lastSavedStagesRef.current === "") {
      console.log("Initial stages state captured, auto-save ready");
      lastSavedStagesRef.current = currentStagesJson;
      return;
    }

    // Если данные не изменились - не сохраняем
    if (currentStagesJson === lastSavedStagesRef.current) {
      return;
    }

    // Если сейчас идет сохранение - не запускаем авто
    if (saving) return;

    console.log("Auto-save scheduled in 3 seconds...");
    const timeoutId = setTimeout(() => {
      console.log("Executing auto-save...");
      handleSaveProject();
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [stages, loading, saving, handleSaveProject]);

  const openStageModal = (stage?: Stage) => {
    setModalConfig({
      isOpen: true,
      entity: "stage",
      editingStageId: stage?.id,
      initialValues: stage
        ? {
            name: stage.name,
            responsibles: stage.responsibles,
            duration: stage.duration,
            feedback: stage.feedback,
            dependencies: stage.dependencies
          }
        : undefined
    });
  };

  const openTaskModal = (stageId: number, task?: Task) => {
    setModalConfig({
      isOpen: true,
      entity: "task",
      parentStageId: stageId,
      editingTaskId: task?.id,
      initialValues: task
        ? {
            name: task.name,
            responsibles: task.responsibles,
            duration: task.duration,
            feedback: task.feedback,
            dependencies: task.dependencies
          }
        : undefined
    });
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, entity: "stage" });
  };

  const handleStageTaskSubmit = (values: StageTaskFormValues) => {
    if (modalConfig.entity === "stage") {
      if (modalConfig.editingStageId) {
        setStages((prev) => {
          const updated = prev.map((stage) =>
            stage.id === modalConfig.editingStageId
              ? {
                  ...stage,
                  name: values.name,
                  responsibles: values.responsibles,
                  duration: values.duration,
                  feedback: values.feedback,
                  dependencies: values.dependencies || []
                }
              : stage
          );
          return recalculateDates(updated);
        });
      } else {
        const newStage: Stage = {
          id: Date.now(), // Временный ID
          name: values.name,
          responsibles: values.responsibles,
          duration: values.duration,
          feedback: values.feedback,
          isCompleted: false,
          tasks: [],
          dependencies: values.dependencies || []
        };
        setStages((prev) => {
          const updated = [...prev, newStage];
          return recalculateDates(updated);
        });
      }
    } else if (modalConfig.parentStageId) {
      setStages((prev) => {
        const updated = prev.map((stage) => {
          if (stage.id !== modalConfig.parentStageId) {
            return stage;
          }
          if (modalConfig.editingTaskId) {
            return {
              ...stage,
              tasks: stage.tasks.map((task) =>
                task.id === modalConfig.editingTaskId
                  ? {
                      ...task,
                      name: values.name,
                      responsibles: values.responsibles,
                      duration: values.duration,
                      feedback: values.feedback,
                      dependencies: values.dependencies || []
                    }
                  : task
              )
            };
          }
          const newTask: Task = {
            id: Date.now(), // Временный ID
            name: values.name,
            responsibles: values.responsibles,
            duration: values.duration,
            feedback: values.feedback,
            isCompleted: false,
            dependencies: values.dependencies || []
          };
          return {
            ...stage,
            tasks: [...stage.tasks, newTask]
          };
        });
        return recalculateDates(updated);
      });
    }
    closeModal();
  };

  const handleDeleteStage = (stageId: number) => {
    // eslint-disable-next-line no-alert
    if (window.confirm("Удалить этап и все его задачи?")) {
      setStages((prev) => prev.filter((stage) => stage.id !== stageId));
    }
  };

  const handleDeleteTask = (stageId: number, taskId: number) => {
    // eslint-disable-next-line no-alert
    if (window.confirm("Удалить задачу?")) {
      setStages((prev) =>
        prev.map((stage) =>
          stage.id === stageId ? { ...stage, tasks: stage.tasks.filter((task) => task.id !== taskId) } : stage
        )
      );
    }
  };

  const toggleStageCompletion = (stageId: number) => {
    setStages((prev) =>
      prev.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              isCompleted: !stage.isCompleted
            }
          : stage
      )
    );
  };

  const toggleTaskCompletion = (stageId: number, taskId: number) => {
    setStages((prev) =>
      prev.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              tasks: stage.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      isCompleted: !task.isCompleted
                    }
                  : task
              )
            }
          : stage
      )
    );
  };

  const updateStageDependencies = (stageId: number, dependencyIds: number[]) => {
    setStages((prev) => {
      const deps = Array.isArray(dependencyIds) ? dependencyIds : [];
      let updated = prev.map((stage) => (stage.id === stageId ? { ...stage, dependencies: deps } : stage));
      
      if (deps.length > 0) {
        const dependentStageIndex = updated.findIndex((s) => s.id === stageId);
        const dependentStage = updated[dependentStageIndex];
        
        if (dependentStage && dependentStageIndex !== -1) {
          const dependencyIndices = deps
            .map((depId) => updated.findIndex((s) => s.id === depId))
            .filter((idx) => idx !== -1);
          
          if (dependencyIndices.length > 0) {
            const maxDepIndex = Math.max(...dependencyIndices);
            const currentIndex = dependentStageIndex;
            
            if (currentIndex <= maxDepIndex) {
              const movedStage = updated[currentIndex];
              updated.splice(currentIndex, 1);
              const newMaxDepIndex = Math.max(
                ...deps
                  .map((depId) => updated.findIndex((s) => s.id === depId))
                  .filter((idx) => idx !== -1)
              );
              updated.splice(newMaxDepIndex + 1, 0, movedStage);
            }
          }
        }
      }
      
      let reordered = reorderStagesByDependencies(updated);
      
      if (deps.length > 0) {
        const dependentStageIndex = reordered.findIndex((s) => s.id === stageId);
        const dependencyIndices = deps
          .map((depId) => reordered.findIndex((s) => s.id === depId))
          .filter((idx) => idx !== -1);
        
        if (dependencyIndices.length > 0 && dependentStageIndex !== -1) {
          const maxDepIndex = Math.max(...dependencyIndices);
          if (dependentStageIndex <= maxDepIndex || dependentStageIndex > maxDepIndex + 1) {
            const [movedStage] = reordered.splice(dependentStageIndex, 1);
            const insertIndex = maxDepIndex < dependentStageIndex ? maxDepIndex + 1 : maxDepIndex + 1;
            reordered.splice(insertIndex, 0, movedStage);
          }
        }
      }
      
      const withReorderedTasks = reordered.map((stage) => ({
        ...stage,
        tasks: reorderTasksByDependencies(stage.tasks)
      }));
      
      return recalculateDates(withReorderedTasks);
    });
  };

  const updateTaskDependencies = (stageId: number, taskId: number, dependencyIds: number[]) => {
    setStages((prev) => {
      const deps = Array.isArray(dependencyIds) ? dependencyIds : [];
      const updated = prev.map((stage) => {
        if (stage.id !== stageId) {
          return stage;
        }
        
        let updatedTasks = stage.tasks.map((task) => 
          task.id === taskId ? { ...task, dependencies: deps } : task
        );
        
        if (deps.length > 0) {
          const dependentTaskIndex = updatedTasks.findIndex((t) => t.id === taskId);
          const dependentTask = updatedTasks[dependentTaskIndex];
          
          if (dependentTask && dependentTaskIndex !== -1) {
            const taskDependencyIndices = deps
              .map((depId) => {
                const depTask = updatedTasks.find((t) => t.id === depId);
                return depTask ? updatedTasks.findIndex((t) => t.id === depId) : -1;
              })
              .filter((idx) => idx !== -1);
            
            if (taskDependencyIndices.length > 0) {
              const maxTaskDepIndex = Math.max(...taskDependencyIndices);
              const currentTaskIndex = dependentTaskIndex;
              
              if (currentTaskIndex <= maxTaskDepIndex) {
                const movedTask = updatedTasks[currentTaskIndex];
                updatedTasks.splice(currentTaskIndex, 1);
                const newMaxTaskDepIndex = Math.max(
                  ...deps
                    .map((depId) => {
                      const depTask = updatedTasks.find((t) => t.id === depId);
                      return depTask ? updatedTasks.findIndex((t) => t.id === depId) : -1;
                    })
                    .filter((idx) => idx !== -1)
                );
                updatedTasks.splice(newMaxTaskDepIndex + 1, 0, movedTask);
              }
            }
          }
        }
        
        return {
          ...stage,
          tasks: updatedTasks
        };
      });
      
      const reorderedStages = reorderStagesByDependencies(updated);
      
      const withReorderedTasks = reorderedStages.map((stage) => ({
        ...stage,
        tasks: reorderTasksByDependencies(stage.tasks)
      }));
      
      return recalculateDates(withReorderedTasks);
    });
  };

  const [draggedItem, setDraggedItem] = useState<{ type: "stage" | "task"; id: number; stageId?: number } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ type: "stage" | "task"; id: number; stageId?: number } | null>(null);

  const handleDragStart = (e: React.DragEvent, type: "stage" | "task", id: number, stageId?: number) => {
    setDraggedItem({ type, id, stageId });
    e.dataTransfer.effectAllowed = "link";
    if (e.dataTransfer) {
      e.dataTransfer.setData("text/plain", "");
    }
  };

  const handleDragOver = (e: React.DragEvent, type: "stage" | "task", id: number, stageId?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "link";
    if (!draggedItem || (draggedItem.type === type && draggedItem.id === id)) {
      return;
    }
    setDragOverTarget({ type, id, stageId });
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetType: "stage" | "task", targetId: number, targetStageId?: number) => {
    e.preventDefault();
    setDragOverTarget(null);

    if (!draggedItem || (draggedItem.type === targetType && draggedItem.id === targetId)) {
      setDraggedItem(null);
      return;
    }

    if (draggedItem.type === "task" && targetType === "stage") {
      setDraggedItem(null);
      return;
    }

    if (targetType === "stage") {
      const currentStage = stages.find((s) => s.id === targetId);
      const currentDeps = currentStage?.dependencies || [];
      const newDeps = draggedItem.type === "stage" 
        ? [...currentDeps.filter((d) => d !== draggedItem.id), draggedItem.id]
        : currentDeps;
      updateStageDependencies(targetId, newDeps);
    } else if (targetType === "task" && targetStageId) {
      const stage = stages.find((s) => s.id === targetStageId);
      const task = stage?.tasks.find((t) => t.id === targetId);
      const currentDeps = task?.dependencies || [];
      let newDeps: number[];
      
      if (draggedItem.type === "task" && draggedItem.stageId === targetStageId) {
        newDeps = [...currentDeps.filter((d) => d !== draggedItem.id), draggedItem.id];
      } else if (draggedItem.type === "stage") {
        const draggedStage = stages.find((s) => s.id === draggedItem.id);
        const stageTaskIds = draggedStage?.tasks.map((t) => t.id) || [];
        newDeps = [...currentDeps.filter((d) => !stageTaskIds.includes(d)), ...stageTaskIds];
      } else {
        newDeps = currentDeps;
      }
      
      updateTaskDependencies(targetStageId, targetId, newDeps);
    }

    setDraggedItem(null);
  };

  const renderStageRow = (stage: Stage) => {
    const startDate = stage.startDate ? new Date(stage.startDate) : undefined;
    const endDate = stage.endDate ? new Date(stage.endDate) : undefined;
    const { columnStart, span } = getBarPosition(startDate, endDate, creationDate, dateRange.length);
    const isDragging = draggedItem?.type === "stage" && draggedItem.id === stage.id;
    const isDragOver = dragOverTarget?.type === "stage" && dragOverTarget.id === stage.id;

  return (
      <div 
        key={`stage-${stage.id}`} 
        className="gantt-row" 
        style={{ gridTemplateColumns: gridTemplate }}
        onMouseEnter={() => setHoveredEntity({ id: stage.id, type: "stage" })}
        onMouseLeave={() => setHoveredEntity(null)}
      >
        <div className="gantt-label-cell">
          <div
            className="stage-row-content"
            draggable
            onDragStart={(e) => handleDragStart(e, "stage", stage.id)}
            onDragOver={(e) => handleDragOver(e, "stage", stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, "stage", stage.id)}
            style={{
              opacity: isDragging ? 0.5 : 1,
              background: isDragOver ? "rgba(59, 130, 246, 0.1)" : "transparent",
              borderRadius: "8px",
              padding: "0.25rem",
              cursor: "grab",
              width: "100%",
              minWidth: 0,
              overflow: "hidden"
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "nowrap", overflow: "hidden" }}>
              <input
                type="checkbox"
                checked={stage.isCompleted}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleStageCompletion(stage.id);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: "pointer", width: "18px", height: "18px", flexShrink: 0 }}
              />
              <span
                style={{ 
                  fontWeight: 600, 
                  color: "#0f172a", 
                  cursor: "pointer", 
                  flex: 1, 
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
                onClick={() => openStageModal(stage)}
                title={stage.name}
              >
                {stage.name}
              </span>
              <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexShrink: 0 }}>
                <button
                  type="button"
                  title="Добавить задачу"
                  onClick={(e) => {
                    e.stopPropagation();
                    openTaskModal(stage.id);
                  }}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    border: "1px solid rgba(148, 163, 184, 0.35)",
                    background: "white",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#2563eb",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  +
                </button>
                <button
                  type="button"
                  title="Удалить этап"
                  className="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStage(stage.id);
                  }}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    background: "white",
                    fontSize: "1.2rem",
                    color: "#dc2626",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            {stage.feedback && (
              <div 
                style={{ 
                  color: "#475569", 
                  fontSize: "0.85rem", 
                  marginTop: "0.25rem", 
                  paddingLeft: "28px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }} 
                title={stage.feedback}
              >
                {stage.feedback}
              </div>
            )}
          </div>
        </div>
        <div className="responsible-cell">{renderResponsibles(stage.responsibles)}</div>
        <div className="gantt-grid" style={{ gridTemplateColumns: `repeat(${dateRange.length}, 70px)` }}>
          <div
            className={`gantt-bar stage${stage.isCompleted ? " completed" : ""}`}
            style={{ gridColumn: `${columnStart} / span ${span}` }}
            data-gantt-type="stage"
            data-gantt-id={stage.id}
            onClick={() => openStageModal(stage)}
          >
            <span>{stage.duration} дн.</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTaskRow = (stage: Stage, task: Task) => {
    const startDate = task.startDate ? new Date(task.startDate) : undefined;
    const endDate = task.endDate ? new Date(task.endDate) : undefined;
    const { columnStart, span } = getBarPosition(startDate, endDate, creationDate, dateRange.length);
    const isDragging = draggedItem?.type === "task" && draggedItem.id === task.id && draggedItem.stageId === stage.id;
    const isDragOver = dragOverTarget?.type === "task" && dragOverTarget.id === task.id && dragOverTarget.stageId === stage.id;
    
    return (
      <div 
        key={`task-${task.id}`} 
        className="gantt-row" 
        style={{ gridTemplateColumns: gridTemplate }}
        onMouseEnter={() => setHoveredEntity({ id: task.id, type: "task" })}
        onMouseLeave={() => setHoveredEntity(null)}
      >
        <div className="gantt-label-cell task">
          <div
            className="task-row-content"
            draggable
            onDragStart={(e) => handleDragStart(e, "task", task.id, stage.id)}
            onDragOver={(e) => handleDragOver(e, "task", task.id, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, "task", task.id, stage.id)}
            style={{
              opacity: isDragging ? 0.5 : 1,
              background: isDragOver ? "rgba(59, 130, 246, 0.1)" : "transparent",
              borderRadius: "8px",
              padding: "0.25rem",
              cursor: "grab",
              width: "100%",
              minWidth: 0,
              overflow: "hidden"
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "nowrap", overflow: "hidden" }}>
              <input
                type="checkbox"
                checked={task.isCompleted}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleTaskCompletion(stage.id, task.id);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: "pointer", width: "18px", height: "18px", flexShrink: 0 }}
              />
              <span
                style={{ 
                  fontWeight: 500, 
                  color: "#0f172a", 
                  cursor: "pointer", 
                  flex: 1, 
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
                onClick={() => openTaskModal(stage.id, task)}
                title={task.name}
              >
                {task.name}
              </span>
              <button
                type="button"
                title="Удалить задачу"
                className="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTask(stage.id, task.id);
                }}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  background: "white",
                  fontSize: "1.2rem",
                  color: "#dc2626",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  flexShrink: 0
                }}
              >
                ×
              </button>
            </div>
            {task.feedback && (
              <div 
                style={{ 
                  color: "#475569", 
                  fontSize: "0.85rem", 
                  marginTop: "0.25rem", 
                  paddingLeft: "28px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }} 
                title={task.feedback}
              >
                {task.feedback}
              </div>
            )}
          </div>
        </div>
        <div className="responsible-cell">{renderResponsibles(task.responsibles)}</div>
        <div className="gantt-grid" style={{ gridTemplateColumns: `repeat(${dateRange.length}, 70px)` }}>
          <div
            className={`gantt-bar task${task.isCompleted ? " completed" : ""}`}
            style={{ gridColumn: `${columnStart} / span ${span}` }}
            data-gantt-type="task"
            data-gantt-id={task.id}
            onClick={() => openTaskModal(stage.id, task)}
          >
            <span>{task.duration} дн.</span>
          </div>
        </div>
      </div>
    );
  };

  const buildBezierPath = (
    from: { left: number; top: number; right: number; bottom: number },
    to: { left: number; top: number; right: number; bottom: number }
  ) => {
    // from = Зависимый (например, Этап 3), to = Предшественник (Этап 1 или 2)
    // Линия выходит из ЛЕВОГО края зависимого и плавно идет к ПРАВОМУ краю предшественника
    const startX = from.left;
    const startY = (from.top + from.bottom) / 2;
    const endX = to.right;
    const endY = (to.top + to.bottom) / 2;

    const deltaX = Math.abs(startX - endX);
    // Чем дальше элементы, тем сильнее изгиб, но не менее 40px
    const curvature = Math.max(deltaX * 0.5, 40);

    // Кубическая кривая Безье:
    // M startX startY (точка начала)
    // C cp1X startY (контрольная точка 1), cp2X endY (контрольная точка 2), endX endY (точка конца)
    return `M ${startX} ${startY} C ${startX - curvature} ${startY}, ${endX + curvature} ${endY}, ${endX} ${endY}`;
  };

  const recomputeDependencyOverlay = useCallback(() => {
    const tableEl = ganttTableRef.current;
    if (!tableEl) return;

    const tableRect = tableEl.getBoundingClientRect();
    const width = Math.ceil(tableEl.scrollWidth);
    const height = Math.ceil(tableEl.scrollHeight);
    setDepsSvgSize({ width, height });

    const nodes = Array.from(tableEl.querySelectorAll<HTMLElement>(".gantt-bar[data-gantt-type][data-gantt-id]"));
    const rectByKey = new Map<string, { left: number; top: number; right: number; bottom: number }>();

    for (const el of nodes) {
      const type = el.dataset.ganttType;
      const idStr = el.dataset.ganttId;
      if (!type || !idStr) continue;
      const rect = el.getBoundingClientRect();
      rectByKey.set(`${type}:${idStr}`, {
        left: rect.left - tableRect.left,
        top: rect.top - tableRect.top,
        right: rect.right - tableRect.left,
        bottom: rect.bottom - tableRect.top
      });
    }

    const nextPaths: Array<{ key: string; d: string; stroke: string; opacity: number; strokeWidth: number }> = [];

    for (const stage of stages) {
      const stageKey = `stage:${stage.id}`;
      const stageRect = rectByKey.get(stageKey);
      if (stageRect && stage.dependencies?.length) {
        for (const depId of stage.dependencies) {
          const fromKey = `stage:${depId}`;
          const fromRect = rectByKey.get(fromKey);
          if (!fromRect) continue;

          const isHighlighted = hoveredEntity?.type === "stage" && (hoveredEntity.id === stage.id || hoveredEntity.id === depId);

          nextPaths.push({
            key: `s:${stage.id}->${depId}`,
            d: buildBezierPath(stageRect, fromRect),
            stroke: isHighlighted ? "#3b82f6" : "rgba(148, 163, 184, 0.4)",
            opacity: isHighlighted ? 1 : 0.6,
            strokeWidth: isHighlighted ? 2 : 1.2
          });
        }
      }

      for (const task of stage.tasks) {
        const taskKey = `task:${task.id}`;
        const taskRect = rectByKey.get(taskKey);
        if (!taskRect || !task.dependencies?.length) continue;

        for (const depId of task.dependencies) {
          const fromTaskKey = `task:${depId}`;
          const fromRect = rectByKey.get(fromTaskKey);
          if (!fromRect) continue;

          const isHighlighted = hoveredEntity?.type === "task" && (hoveredEntity.id === task.id || hoveredEntity.id === depId);

          nextPaths.push({
            key: `t:${task.id}->${depId}`,
            d: buildBezierPath(taskRect, fromRect),
            stroke: isHighlighted ? "#10b981" : "rgba(148, 163, 184, 0.4)",
            opacity: isHighlighted ? 1 : 0.6,
            strokeWidth: isHighlighted ? 2 : 1.2
          });
        }
      }
    }

    console.log(`Recomputed dependency overlay: ${nextPaths.length} paths found`);
    setDepsPaths(nextPaths);
  }, [stages, hoveredEntity]);

  useLayoutEffect(() => {
    if (!loading && stages.length > 0) {
      // Используем небольшой таймаут, чтобы дать браузеру время на отрисовку таблицы
      // и корректный расчет координат элементов через getBoundingClientRect
      const timer = setTimeout(() => {
        recomputeDependencyOverlay();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [recomputeDependencyOverlay, loading, stages.length, dateRange.length, gridTemplate]);

  useEffect(() => {
    const onResize = () => recomputeDependencyOverlay();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recomputeDependencyOverlay]);

  if (loading) {
    return (
      <div style={{ paddingTop: "80px", minHeight: "100vh", display: "flex", justifyContent: "center" }}>
        Загрузка...
      </div>
    );
  }

  if (!projectDetails) {
    return (
        <div style={{ paddingTop: "80px", textAlign: "center" }}>Проект не найден</div>
    )
  }

  return (
    <div style={{ paddingTop: "80px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ flex: 1, padding: "1.5rem 2rem 2rem", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginBottom: "1.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "10px",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            background: "white",
            color: "#475569",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          ← Назад
        </button>
            <div style={{ 
              marginBottom: "1.5rem",
              fontSize: "0.9rem", 
              color: saveStatus === "error" ? "#dc2626" : "#64748b",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              {saveStatus === "saving" && (
                <>
                  <span style={{ 
                    width: "8px", 
                    height: "8px", 
                    borderRadius: "50%", 
                    background: "#3b82f6",
                    display: "inline-block",
                    animation: "pulse 1.5s infinite"
                  }} />
                  Сохранение...
                </>
              )}
              {saveStatus === "saved" && "✓ Сохранено"}
              {saveStatus === "error" && "× Ошибка сохранения"}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem", maxWidth: "100%" }}>
            <h1 style={{ 
              fontSize: "2rem", 
              color: "#1d4ed8", 
              marginBottom: "0.5rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }} title={projectDetails.name}>
              {projectDetails.name}
            </h1>
            <p style={{ color: "#475569" }}>Команда: {teamName}</p>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
              Длительность проекта: {durationDays} дн. (с {creationDate.toLocaleDateString("ru-RU")} по {deadlineDate.toLocaleDateString("ru-RU")})
            </p>
        </div>

        <div className="gantt-wrapper" style={{ position: "relative" }}>
          <div className="gantt-table" ref={ganttTableRef}>
            {depsSvgSize.width > 0 && depsSvgSize.height > 0 && (
              <svg
                className="gantt-deps-overlay"
                width={depsSvgSize.width}
                height={depsSvgSize.height}
                viewBox={`0 0 ${depsSvgSize.width} ${depsSvgSize.height}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <marker
                    id="ganttArrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                  </marker>
                </defs>

                {depsPaths.map((p) => (
                  <path
                    key={p.key}
                    d={p.d}
                    fill="none"
                    stroke={p.stroke}
                    strokeWidth={p.strokeWidth}
                    opacity={p.opacity}
                    markerEnd="url(#ganttArrow)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: "all 0.2s ease", color: p.stroke }}
                  />
                ))}
              </svg>
            )}
            <div className="gantt-header-row" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="gantt-header-cell label" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Этапы / задачи</div>
              <div className="gantt-header-cell label" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Ответственные</div>
            {dateRange.map((date) => {
              const today = new Date();
              const isToday = isSameLocalDay(date, today);
              return (
                <div key={date.toISOString()} className={`gantt-header-cell${isToday ? " today" : ""}`}>
                  <div className="gantt-header-weekday" style={{ textTransform: "capitalize" }}>
                    {formatWeekday(date)}
                  </div>
                  <div className="gantt-header-day">
                <strong>{date.getDate()}</strong>
                    {isToday && <span className="gantt-today-dot" aria-hidden="true" />}
              </div>
              </div>
              );
            })}
          </div>

            <div className="gantt-row" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="gantt-label-cell">
              <div style={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "nowrap", overflow: "hidden" }}>
                  <span style={{ 
                    fontWeight: 600, 
                    color: "#0f172a", 
                    flex: 1, 
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }} title={projectDetails.name}>
                    {projectDetails.name}
                  </span>
                  <button
                      title="Добавить этап"
                      onClick={() => openStageModal()}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        border: "1px solid rgba(148, 163, 184, 0.35)",
                        background: "white",
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "#2563eb",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      +
                    </button>
                  </div>
              </div>
            </div>
              <div className="responsible-cell">
                <span className="responsible-chip ghost">Вся команда</span>
            </div>
              <div className="gantt-grid" style={{ gridTemplateColumns: `repeat(${dateRange.length}, 70px)` }}>
                <div className="gantt-bar project" style={{ gridColumn: `1 / span ${dateRange.length}` }} onClick={() => openStageModal()}>
                <span>{durationDays} дн.</span>
              </div>
            </div>
          </div>

            {stages.map((stage) => (
              <Fragment key={stage.id}>
                {renderStageRow(stage)}
                {stage.tasks.map((task) => renderTaskRow(stage, task))}
              </Fragment>
            ))}
        </div>
      </div>
      </div>

      <StageTaskModal
        isOpen={modalConfig.isOpen}
        entityLabel={modalConfig.entity === "stage" ? "этап" : "задачу"}
        teamMembers={teamMembers}
        allAvailableEntities={allAvailableEntities}
        onClose={closeModal}
        onSubmit={handleStageTaskSubmit}
        initialValues={modalConfig.initialValues}
      />
    </div>
  );
};
