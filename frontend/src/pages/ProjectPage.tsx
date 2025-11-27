import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Header } from "../components/Header";
import { StageTaskFormValues, StageTaskModal } from "../components/StageTaskModal";

const mockTeamMembers = ["Алексей Смирнов", "Мария Иванова", "Сергей Ким", "Елена Соколова", "Дмитрий Петров"];

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
  deadline: string;
  creationDate: string;
  feedback?: string;
  isCompleted: boolean;
  dependencies?: number[]; // IDs of tasks this task depends on
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


const createFallbackProject = (projectId?: string): ProjectDetails => {
  const now = new Date();
  const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    id: projectId ? Number(projectId) : Date.now(),
    name: "Демо-проект",
    creationDate: now.toISOString(),
    deadline: deadline.toISOString(),
    description: "Это демо-проект. Вернитесь на страницу команды и откройте проект оттуда, чтобы увидеть реальные данные."
  };
};

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

  return people.map((person) => (
    <span key={person} className="responsible-chip">
      {person}
    </span>
  ));
};

const getBarPosition = (startISO: string, endISO: string, projectStart: Date, totalColumns: number) => {
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  const startDate = new Date(startISO);
  const endDate = new Date(endISO);
  let startIndex = Math.floor((startDate.getTime() - projectStart.getTime()) / dayMs);
  let endIndex = Math.floor((endDate.getTime() - projectStart.getTime()) / dayMs);
  startIndex = clamp(startIndex, 0, totalColumns - 1);
  endIndex = clamp(Math.max(startIndex, endIndex), startIndex, totalColumns - 1);
  return {
    columnStart: startIndex + 1,
    span: Math.max(1, endIndex - startIndex + 1)
  };
};

// Dependencies Arrows Component
interface DependenciesArrowsProps {
  stages: Stage[];
  dateRange: Date[];
  creationDate: Date;
}

const DependenciesArrows = ({ stages, dateRange, creationDate }: DependenciesArrowsProps) => {
  const arrowElements: Array<{
    from: { column: number; row: number };
    to: { column: number; row: number };
    fromStage?: Stage;
    toStage?: Stage;
    fromTask?: Task;
    toTask?: Task;
    fromStageId?: number;
    toStageId?: number;
  }> = [];

  // Calculate row offsets
  let currentRow = 2; // Start after header (0) and project row (1)
  
  stages.forEach((toStage, toStageIndex) => {
    const stageRow = currentRow;
    currentRow++;
    
    // Stage dependencies
    if (toStage.dependencies && toStage.dependencies.length > 0) {
      toStage.dependencies.forEach((depStageId) => {
        const fromStage = stages.find((s) => s.id === depStageId);
        if (fromStage) {
          const fromStageIndex = stages.findIndex((s) => s.id === depStageId);
          let fromRow = 2; // Start after header and project
          stages.slice(0, fromStageIndex).forEach((s) => {
            fromRow++; // Stage row
            fromRow += s.tasks.length; // Task rows
          });
          
          const fromPos = getBarPosition(fromStage.creationDate, fromStage.deadline, creationDate, dateRange.length);
          const toPos = getBarPosition(toStage.creationDate, toStage.deadline, creationDate, dateRange.length);

          arrowElements.push({
            from: { column: fromPos.columnStart + fromPos.span - 1, row: fromRow },
            to: { column: toPos.columnStart, row: stageRow },
            fromStage,
            toStage
          });
        }
      });
    }
    
    // Task dependencies
    toStage.tasks.forEach((toTask) => {
      const taskRow = currentRow;
      currentRow++;
      
      if (toTask.dependencies && toTask.dependencies.length > 0) {
        toTask.dependencies.forEach((depId) => {
          // Check if dependency is a stage
          const fromStage = stages.find((s) => s.id === depId);
          if (fromStage) {
            let fromRow = 2;
            stages.slice(0, stages.findIndex((s) => s.id === depId)).forEach((s) => {
              fromRow++;
              fromRow += s.tasks.length;
            });
            
            const fromPos = getBarPosition(fromStage.creationDate, fromStage.deadline, creationDate, dateRange.length);
            const toPos = getBarPosition(toTask.creationDate, toTask.deadline, creationDate, dateRange.length);
            
            arrowElements.push({
              from: { column: fromPos.columnStart + fromPos.span - 1, row: fromRow },
              to: { column: toPos.columnStart, row: taskRow },
              fromStage,
              toTask,
              toStageId: toStage.id
            });
          } else {
            // Check if dependency is a task
            const fromTask = toStage.tasks.find((t) => t.id === depId);
            if (fromTask) {
              let fromRow = stageRow + 1; // Start from stage row + 1
              toStage.tasks.slice(0, toStage.tasks.findIndex((t) => t.id === depId)).forEach(() => {
                fromRow++;
              });
              
              const fromPos = getBarPosition(fromTask.creationDate, fromTask.deadline, creationDate, dateRange.length);
              const toPos = getBarPosition(toTask.creationDate, toTask.deadline, creationDate, dateRange.length);
              
              arrowElements.push({
                from: { column: fromPos.columnStart + fromPos.span - 1, row: fromRow },
                to: { column: toPos.columnStart, row: taskRow },
                fromTask,
                toTask,
                fromStageId: toStage.id,
                toStageId: toStage.id
              });
            }
          }
        });
      }
    });
  });

  if (arrowElements.length === 0) return null;

  // Calculate approximate positions
  const rowHeight = 100; // approximate row height
  const headerOffset = 80; // header height
  const labelWidth = 520; // label column width (320px + 200px)
  const columnWidth = 70; // approximate column width

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#1d4ed8" />
        </marker>
      </defs>
      {arrowElements.map((arrow, idx) => {
        const fromX = labelWidth + (arrow.from.column - 0.5) * columnWidth;
        const fromY = headerOffset + arrow.from.row * rowHeight + rowHeight / 2;
        const toX = labelWidth + (arrow.to.column - 0.5) * columnWidth;
        const toY = headerOffset + arrow.to.row * rowHeight + rowHeight / 2;

        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);

        // Arrow head size
        const arrowSize = 8;
        const arrowX = toX - arrowSize * Math.cos(angle);
        const arrowY = toY - arrowSize * Math.sin(angle);

        const arrowKey = arrow.fromStage
          ? `arrow-stage-${arrow.fromStage.id}-to-${arrow.toStage ? `stage-${arrow.toStage.id}` : `task-${arrow.toTask?.id}`}`
          : arrow.fromTask
          ? `arrow-task-${arrow.fromTask.id}-to-task-${arrow.toTask?.id}`
          : `arrow-${idx}`;
        
        return (
          <line
            key={arrowKey}
            x1={fromX}
            y1={fromY}
            x2={arrowX}
            y2={arrowY}
            stroke="#1d4ed8"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        );
      })}
    </svg>
  );
};

export const ProjectPage = () => {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;

  const project = state?.project ?? createFallbackProject(projectId);
  const teamName = state?.teamName ?? `Команда #${teamId}`;

  const creationDate = useMemo(() => new Date(project.creationDate), [project.creationDate]);
  const deadlineDate = useMemo(() => new Date(project.deadline), [project.deadline]);

  const dateRange = useMemo(() => {
    if (deadlineDate < creationDate) {
      return [creationDate];
    }
    return getDatesBetween(creationDate, deadlineDate);
  }, [creationDate, deadlineDate]);

  const durationDays = Math.max(1, dateRange.length);
  const gridTemplate = `320px 200px repeat(${dateRange.length}, minmax(70px, 1fr))`;

  const [stages, setStages] = useState<Stage[]>([]);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false, entity: "stage" });

  useEffect(() => {
    const key = `rg-project-${project.id}-stages`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as Stage[];
        if (Array.isArray(parsed)) {
          setStages(parsed);
        }
      }
    } catch (error) {
      console.warn("Не удалось загрузить этапы проекта", error);
    }
  }, [project.id]);

  useEffect(() => {
    const key = `rg-project-${project.id}-stages`;
    try {
      localStorage.setItem(key, JSON.stringify(stages));
    } catch (error) {
      console.warn("Не удалось сохранить этапы проекта", error);
    }
  }, [project.id, stages]);

  const openStageModal = (stage?: Stage) => {
    setModalConfig({
      isOpen: true,
      entity: "stage",
      editingStageId: stage?.id,
      initialValues: stage
        ? {
            name: stage.name,
          responsibles: stage.responsibles,
            deadline: stage.deadline,
            feedback: stage.feedback,
            creationDate: stage.creationDate
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
            deadline: task.deadline,
            feedback: task.feedback,
            creationDate: task.creationDate
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
        setStages((prev) =>
          prev.map((stage) =>
            stage.id === modalConfig.editingStageId
              ? {
                  ...stage,
                  name: values.name,
                responsibles: values.responsibles,
                  deadline: values.deadline,
                  feedback: values.feedback,
                  creationDate: values.creationDate
                }
              : stage
          )
        );
      } else {
        const newStage: Stage = {
          id: Date.now(),
          name: values.name,
        responsibles: values.responsibles,
          deadline: values.deadline,
          creationDate: values.creationDate,
          feedback: values.feedback,
          isCompleted: false,
          tasks: []
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
                      deadline: values.deadline,
                      feedback: values.feedback,
                      creationDate: values.creationDate
                    }
                  : task
              )
            };
          }
          const newTask: Task = {
            id: Date.now(),
            name: values.name,
          responsibles: values.responsibles,
            deadline: values.deadline,
            creationDate: values.creationDate,
            feedback: values.feedback,
            isCompleted: false
          };
          return {
            ...stage,
            tasks: [...stage.tasks, newTask]
          };
        });
        // Пересчитываем даты, если есть зависимости
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

  // Функция для пересчета дат на основе зависимостей (реверсивная диаграмма Ганта)
  // Если этап A зависит от этапа B, то этап B должен закончиться ДО начала этапа A
  const recalculateDates = (stagesList: Stage[]): Stage[] => {
    const updatedStages = stagesList.map((stage) => ({
      ...stage,
      tasks: stage.tasks.map((task) => ({ ...task }))
    }));
    
    const processed = new Set<number>();
    
    // Функция для получения даты окончания
    const getEndDate = (entity: Stage | Task): Date => new Date(entity.deadline);
    const getStartDate = (entity: Stage | Task): Date => new Date(entity.creationDate);
    
    // Функция для установки дат этапа на основе его зависимостей
    const processStage = (stage: Stage): void => {
      if (processed.has(stage.id)) return;
      
      let maxDependencyEndDate: Date | null = null;
      
      // Сначала обрабатываем все зависимости
      if (stage.dependencies && stage.dependencies.length > 0) {
        for (const depStageId of stage.dependencies) {
          const depStage = updatedStages.find((s) => s.id === depStageId);
          if (depStage) {
            processStage(depStage); // Рекурсивно обрабатываем зависимости
            const depEnd = getEndDate(depStage);
            if (!maxDependencyEndDate || depEnd > maxDependencyEndDate) {
              maxDependencyEndDate = new Date(depEnd);
            }
          }
        }
      }
      
      // Если есть зависимости, этап должен начинаться после их окончания
      if (maxDependencyEndDate) {
        const originalStart = getStartDate(stage);
        const originalEnd = getEndDate(stage);
        const duration = Math.max(1, Math.ceil((originalEnd.getTime() - originalStart.getTime()) / dayMs));
        
        // Этап начинается на следующий день после окончания последней зависимости
        const newStartDate = new Date(maxDependencyEndDate);
        newStartDate.setDate(newStartDate.getDate() + 1);
        newStartDate.setHours(0, 0, 0, 0);
        
        stage.creationDate = newStartDate.toISOString();
        
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + duration - 1);
        newEndDate.setHours(23, 59, 59, 999);
        stage.deadline = newEndDate.toISOString();
      }
      
      // Обрабатываем задачи этапа
      for (const task of stage.tasks) {
        let taskMaxDependencyEnd: Date | null = new Date(stage.creationDate);
        
        if (task.dependencies && task.dependencies.length > 0) {
          for (const depId of task.dependencies) {
            // Проверяем, является ли зависимость задачей того же этапа
            const depTask = stage.tasks.find((t) => t.id === depId);
            if (depTask) {
              const depEnd = getEndDate(depTask);
              if (depEnd > taskMaxDependencyEnd) {
                taskMaxDependencyEnd = new Date(depEnd);
              }
            } else {
              // Проверяем, является ли зависимость другим этапом
              const depStage = updatedStages.find((s) => s.id === depId);
              if (depStage) {
                processStage(depStage);
                const depEnd = getEndDate(depStage);
                if (depEnd > taskMaxDependencyEnd) {
                  taskMaxDependencyEnd = new Date(depEnd);
                }
              }
            }
          }
          
          // Задача должна начинаться после окончания всех её зависимостей
          const originalTaskStart = getStartDate(task);
          const originalTaskEnd = getEndDate(task);
          const taskDuration = Math.max(1, Math.ceil((originalTaskEnd.getTime() - originalTaskStart.getTime()) / dayMs));
          
          const newTaskStart = new Date(taskMaxDependencyEnd);
          newTaskStart.setDate(newTaskStart.getDate() + 1);
          newTaskStart.setHours(0, 0, 0, 0);
          task.creationDate = newTaskStart.toISOString();
          
          const newTaskEnd = new Date(newTaskStart);
          newTaskEnd.setDate(newTaskEnd.getDate() + taskDuration - 1);
          newTaskEnd.setHours(23, 59, 59, 999);
          task.deadline = newTaskEnd.toISOString();
        }
      }
      
      processed.add(stage.id);
    };
    
    // Обрабатываем все этапы
    for (const stage of updatedStages) {
      processStage(stage);
    }
    
    return updatedStages;
  };

  const updateStageDependencies = (stageId: number, dependencyIds: number[]) => {
    setStages((prev) => {
      const updated = prev.map((stage) => (stage.id === stageId ? { ...stage, dependencies: dependencyIds } : stage));
      return recalculateDates(updated);
    });
  };

  const updateTaskDependencies = (stageId: number, taskId: number, dependencyIds: number[]) => {
    setStages((prev) => {
      const updated = prev.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              tasks: stage.tasks.map((task) => (task.id === taskId ? { ...task, dependencies: dependencyIds } : task))
            }
          : stage
      );
      return recalculateDates(updated);
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

    // Нельзя сделать зависимость от задачи к этапу, только наоборот или одноуровневые
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
        // Зависимость между задачами одного этапа
        newDeps = [...currentDeps.filter((d) => d !== draggedItem.id), draggedItem.id];
      } else if (draggedItem.type === "stage") {
        // Зависимость от этапа - добавляем все задачи этапа
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
    const { columnStart, span } = getBarPosition(stage.creationDate, stage.deadline, creationDate, dateRange.length);
    const isDragging = draggedItem?.type === "stage" && draggedItem.id === stage.id;
    const isDragOver = dragOverTarget?.type === "stage" && dragOverTarget.id === stage.id;
    
    return (
      <div key={`stage-${stage.id}`} className="gantt-row" style={{ gridTemplateColumns: gridTemplate }}>
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
              cursor: "grab"
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="checkbox"
                checked={stage.isCompleted}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleStageCompletion(stage.id);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: "pointer", width: "18px", height: "18px" }}
              />
              <span
                style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer", flex: 1, minWidth: "120px" }}
                onClick={() => openStageModal(stage)}
              >
                📁 {stage.name}
              </span>
              <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
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
                    fontSize: "1rem",
                    color: "#dc2626",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
            {stage.feedback && (
              <div style={{ color: "#475569", fontSize: "0.85rem", marginTop: "0.25rem", paddingLeft: "28px" }}>
                {stage.feedback}
              </div>
            )}
          </div>
        </div>
        <div className="responsible-cell">{renderResponsibles(stage.responsibles)}</div>
        <div className="gantt-grid" style={{ gridTemplateColumns: `repeat(${dateRange.length}, minmax(70px, 1fr))` }}>
          <div
            className={`gantt-bar stage${stage.isCompleted ? " completed" : ""}`}
            style={{ gridColumn: `${columnStart} / span ${span}` }}
            onClick={() => openStageModal(stage)}
          >
            <span>{span} дн.</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTaskRow = (stage: Stage, task: Task) => {
    const { columnStart, span } = getBarPosition(task.creationDate, task.deadline, creationDate, dateRange.length);
    const isDragging = draggedItem?.type === "task" && draggedItem.id === task.id && draggedItem.stageId === stage.id;
    const isDragOver = dragOverTarget?.type === "task" && dragOverTarget.id === task.id && dragOverTarget.stageId === stage.id;
    
    return (
      <div key={`task-${task.id}`} className="gantt-row" style={{ gridTemplateColumns: gridTemplate }}>
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
              cursor: "grab"
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="checkbox"
                checked={task.isCompleted}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleTaskCompletion(stage.id, task.id);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: "pointer", width: "18px", height: "18px" }}
              />
              <span
                style={{ fontWeight: 500, color: "#0f172a", cursor: "pointer", flex: 1, minWidth: "120px" }}
                onClick={() => openTaskModal(stage.id, task)}
              >
                ↳ {task.name}
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
                  fontSize: "1rem",
                  color: "#dc2626",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                🗑
              </button>
            </div>
            {task.feedback && (
              <div style={{ color: "#475569", fontSize: "0.85rem", marginTop: "0.25rem", paddingLeft: "28px" }}>
                {task.feedback}
              </div>
            )}
          </div>
        </div>
        <div className="responsible-cell">{renderResponsibles(task.responsibles)}</div>
        <div className="gantt-grid" style={{ gridTemplateColumns: `repeat(${dateRange.length}, minmax(70px, 1fr))` }}>
          <div
            className={`gantt-bar task${task.isCompleted ? " completed" : ""}`}
            style={{ gridColumn: `${columnStart} / span ${span}` }}
            onClick={() => openTaskModal(stage.id, task)}
          >
            <span>{span} дн.</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ paddingTop: "80px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ flex: 1, padding: "1.5rem 2rem 2rem", width: "100%" }}>
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

        <div style={{ marginBottom: "1.5rem" }}>
            <h1 style={{ fontSize: "2rem", color: "#1d4ed8", marginBottom: "0.5rem" }}>{project.name}</h1>
            <p style={{ color: "#475569" }}>Команда: {teamName}</p>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
              Длительность проекта: {durationDays} дн. (с {creationDate.toLocaleDateString("ru-RU")} по {deadlineDate.toLocaleDateString("ru-RU")})
            </p>
        </div>


        <div className="gantt-wrapper" style={{ position: "relative" }}>
          <div className="gantt-table">
            <div className="gantt-header-row" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="gantt-header-cell label">Этапы / задачи</div>
              <div className="gantt-header-cell label">Ответственные</div>
            {dateRange.map((date) => (
              <div key={date.toISOString()} className="gantt-header-cell">
                <div style={{ textTransform: "capitalize" }}>{formatWeekday(date)}</div>
                <strong>{date.getDate()}</strong>
              </div>
            ))}
          </div>

            <div className="gantt-row" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="gantt-label-cell">
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, color: "#0f172a", flex: 1, minWidth: "120px" }}>📁 {project.name}</span>
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
                    justifyContent: "center"
                  }}
                >
                  +
                </button>
              </div>
            </div>
              <div className="responsible-cell">
                <span className="responsible-chip ghost">Вся команда</span>
            </div>
              <div className="gantt-grid" style={{ gridTemplateColumns: `repeat(${dateRange.length}, minmax(70px, 1fr))` }}>
                <div className="gantt-bar project" style={{ gridColumn: `1 / span ${dateRange.length}` }} onClick={() => openStageModal()}>
                <span>{durationDays} дн.</span>
                </div>
              </div>
            </div>

            {(() => {
              // Топологическая сортировка этапов для правильного отображения
              // Этапы без зависимостей идут первыми, затем этапы, которые зависят от них
              const sortedStages: Stage[] = [];
              const visited = new Set<number>();
              
              const visit = (stageId: number) => {
                if (visited.has(stageId)) return;
                
                const stage = stages.find((s) => s.id === stageId);
                if (!stage) return;
                
                // Сначала посещаем все зависимости
                if (stage.dependencies) {
                  for (const depId of stage.dependencies) {
                    visit(depId);
                  }
                }
                
                visited.add(stageId);
                sortedStages.push(stage);
              };
              
              // Посещаем все этапы
              for (const stage of stages) {
                if (!visited.has(stage.id)) {
                  visit(stage.id);
                }
              }
              
              return sortedStages.map((stage) => (
                <Fragment key={stage.id}>
                  {renderStageRow(stage)}
                  {stage.tasks.map((task) => renderTaskRow(stage, task))}
                </Fragment>
              ));
            })()}
          </div>
          {/* Dependencies arrows overlay */}
          {/* <DependenciesArrows stages={stages} dateRange={dateRange} creationDate={creationDate} /> */}
        </div>
      </div>

      <StageTaskModal
        isOpen={modalConfig.isOpen}
        entityLabel={modalConfig.entity === "stage" ? "этап" : "задачу"}
        teamMembers={mockTeamMembers}
        onClose={closeModal}
        onSubmit={handleStageTaskSubmit}
        initialValues={modalConfig.initialValues}
      />
    </div>
  );
};
