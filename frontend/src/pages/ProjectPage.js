import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { projectsApi } from "../api/projects";
import { teamsApi } from "../api/teams";
import { Header } from "../components/Header";
import { StageTaskModal } from "../components/StageTaskModal";
const getDatesBetween = (start, end) => {
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
};
const formatWeekday = (date) => date.toLocaleDateString("ru-RU", { weekday: "short" }).replace(".", "");
const dayMs = 24 * 60 * 60 * 1000;
const renderResponsibles = (people = []) => {
    if (!people.length) {
        return _jsx("span", { className: "responsible-chip ghost", children: "\u2014" });
    }
    return people.map((person) => (_jsx("span", { className: "responsible-chip", children: person }, person)));
};
const getBarPosition = (startDate, endDate, projectStart, totalColumns) => {
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    if (!startDate || !endDate) {
        return { columnStart: 1, span: 1 };
    }
    let startIndex = Math.floor((startDate.getTime() - projectStart.getTime()) / dayMs);
    let endIndex = Math.floor((endDate.getTime() - projectStart.getTime()) / dayMs);
    startIndex = clamp(startIndex, 0, totalColumns - 1);
    endIndex = clamp(Math.max(startIndex, endIndex), startIndex, totalColumns - 1);
    return {
        columnStart: startIndex + 1,
        span: Math.max(1, endIndex - startIndex + 1)
    };
};
export const ProjectPage = () => {
    const { teamId, projectId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state;
    const [projectDetails, setProjectDetails] = useState(state?.project ?? null);
    const [teamName, setTeamName] = useState(state?.teamName ?? `Команда #${teamId}`);
    const [teamMembers, setTeamMembers] = useState([]);
    const [stages, setStages] = useState([]);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, entity: "stage" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false); // Флаг, что только что сохранили
    const ganttTableRef = useRef(null);
    const [depsSvgSize, setDepsSvgSize] = useState({ width: 0, height: 0 });
    const [depsPaths, setDepsPaths] = useState([]);
    const creationDate = useMemo(() => projectDetails ? new Date(projectDetails.creationDate) : new Date(), [projectDetails]);
    const deadlineDate = useMemo(() => projectDetails ? new Date(projectDetails.deadline) : new Date(), [projectDetails]);
    const dateRange = useMemo(() => {
        if (deadlineDate < creationDate) {
            return [creationDate];
        }
        return getDatesBetween(creationDate, deadlineDate);
    }, [creationDate, deadlineDate]);
    const durationDays = Math.max(1, dateRange.length);
    const gridTemplate = `320px 200px repeat(${dateRange.length}, 70px)`;
    const isSameLocalDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    // Функция для переупорядочивания этапов: зависимые этапы должны быть ниже
    // Если этап A зависит от этапа B, то этап B будет выше (раньше) в списке
    // Сохраняет стабильный порядок для этапов без зависимостей или с одинаковыми зависимостями
    const reorderStagesByDependencies = (stagesList, explicitOrder) => {
        if (stagesList.length === 0)
            return stagesList;
        // Используем явно переданный порядок или создаем из текущего массива
        const originalOrder = explicitOrder || new Map();
        if (!explicitOrder) {
            stagesList.forEach((stage, index) => {
                originalOrder.set(stage.id, index);
            });
        }
        const reordered = [];
        const added = new Set();
        const processing = new Set(); // Защита от циклических зависимостей
        const addStage = (stageId) => {
            if (added.has(stageId))
                return; // Уже добавлен
            if (processing.has(stageId)) {
                // Обнаружена циклическая зависимость - пропускаем эту зависимость
                console.warn(`Circular dependency detected for stage ${stageId}`);
                return;
            }
            const stage = stagesList.find((s) => s.id === stageId);
            if (!stage)
                return;
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
    const reorderTasksByDependencies = (tasks, explicitOrder) => {
        if (tasks.length === 0)
            return tasks;
        // Используем явно переданный порядок или создаем из текущего массива
        const originalOrder = explicitOrder || new Map();
        if (!explicitOrder) {
            tasks.forEach((task, index) => {
                originalOrder.set(task.id, index);
            });
        }
        const reordered = [];
        const added = new Set();
        const processing = new Set(); // Защита от циклических зависимостей
        // Вспомогательная функция для сравнения зависимостей
        const getDependencyKey = (task) => {
            if (!task.dependencies || task.dependencies.length === 0) {
                return ''; // Задачи без зависимостей
            }
            // Сортируем зависимости для стабильности
            return [...task.dependencies].sort((a, b) => a - b).join(',');
        };
        // Группируем задачи по их зависимостям для стабильного порядка
        const tasksByDeps = new Map();
        tasks.forEach(task => {
            const key = getDependencyKey(task);
            if (!tasksByDeps.has(key)) {
                tasksByDeps.set(key, []);
            }
            tasksByDeps.get(key).push(task);
        });
        // Сортируем задачи в каждой группе по исходному порядку
        tasksByDeps.forEach(group => {
            group.sort((a, b) => (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0));
        });
        const addTask = (taskId) => {
            if (added.has(taskId))
                return; // Уже добавлена
            if (processing.has(taskId)) {
                // Обнаружена циклическая зависимость - пропускаем эту зависимость
                console.warn(`Circular dependency detected for task ${taskId}`);
                return;
            }
            const task = tasks.find((t) => t.id === taskId);
            if (!task)
                return;
            processing.add(taskId); // Помечаем как обрабатываемую
            // Сначала добавляем все зависимости этой задачи
            // Зависимости могут быть как задачами, так и этапами
            if (task.dependencies && task.dependencies.length > 0) {
                // Получаем задачи-зависимости в стабильном порядке
                const taskDeps = task.dependencies
                    .map(depId => tasks.find((t) => t.id === depId))
                    .filter((t) => t !== undefined)
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
    const recalculateDates = useCallback((stagesList) => {
        const updatedStages = stagesList.map((stage) => ({
            ...stage,
            tasks: stage.tasks.map((task) => ({ ...task }))
        }));
        const projectDeadline = new Date(deadlineDate);
        projectDeadline.setHours(23, 59, 59, 999);
        const processed = new Set();
        const processingStages = new Set(); // Защита от циклических зависимостей для этапов
        const getStartDate = (entity) => entity.startDate ? new Date(entity.startDate) : new Date(creationDate);
        const getEndDate = (entity) => entity.endDate ? new Date(entity.endDate) : new Date(creationDate);
        const processStage = (stage) => {
            if (processed.has(stage.id))
                return;
            if (processingStages.has(stage.id)) {
                // Обнаружена циклическая зависимость
                console.warn(`Circular dependency detected for stage ${stage.id} in recalculateDates`);
                return;
            }
            processingStages.add(stage.id);
            let minDependentStartDate = null;
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
            let stageEndDate;
            if (minDependentStartDate) {
                stageEndDate = new Date(minDependentStartDate);
                stageEndDate.setDate(stageEndDate.getDate() - 1);
                stageEndDate.setHours(23, 59, 59, 999);
            }
            else {
                stageEndDate = new Date(projectDeadline);
            }
            const stageStartDate = new Date(stageEndDate);
            stageStartDate.setDate(stageStartDate.getDate() - stage.duration + 1);
            stageStartDate.setHours(0, 0, 0, 0);
            stage.startDate = stageStartDate.toISOString();
            stage.endDate = stageEndDate.toISOString();
            processingStages.delete(stage.id);
            const taskProcessed = new Set();
            const processingTasks = new Set(); // Защита от циклических зависимостей для задач
            const processTask = (task) => {
                if (taskProcessed.has(task.id))
                    return;
                if (processingTasks.has(task.id)) {
                    // Обнаружена циклическая зависимость
                    console.warn(`Circular dependency detected for task ${task.id} in recalculateDates`);
                    return;
                }
                processingTasks.add(task.id);
                let minDependentTaskStart = null;
                for (const otherTask of stage.tasks) {
                    if (otherTask.id !== task.id && otherTask.dependencies?.includes(task.id)) {
                        processTask(otherTask);
                        const dependentStart = getStartDate(otherTask);
                        if (!minDependentTaskStart || dependentStart < minDependentTaskStart) {
                            minDependentTaskStart = new Date(dependentStart);
                        }
                    }
                }
                if (task.dependencies) {
                    for (const depId of task.dependencies) {
                        if (depId !== task.id) {
                            const depStage = updatedStages.find((s) => s.id === depId);
                            if (depStage) {
                                processStage(depStage);
                                const depEnd = getEndDate(depStage);
                                if (!minDependentTaskStart || depEnd < minDependentTaskStart) {
                                    minDependentTaskStart = new Date(depEnd);
                                    minDependentTaskStart.setDate(minDependentTaskStart.getDate() + 1);
                                }
                            }
                        }
                    }
                }
                let taskEndDate;
                if (minDependentTaskStart) {
                    taskEndDate = new Date(minDependentTaskStart);
                    taskEndDate.setDate(taskEndDate.getDate() - 1);
                    taskEndDate.setHours(23, 59, 59, 999);
                }
                else {
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
        const stagesWithoutDeps = updatedStages.filter((s) => !s.dependencies || s.dependencies.length === 0);
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
            if (!projectId || !teamId)
                return;
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
                    const mappedStages = apiProject.stages.map(s => ({
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
            }
            catch (error) {
                console.error("Failed to load project data", error);
            }
            finally {
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
            const needsRecalculation = stages.some(stage => !stage.startDate || !stage.endDate ||
                stage.tasks.some(task => !task.startDate || !task.endDate));
            if (needsRecalculation) {
                setStages(prev => recalculateDates(prev));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deadlineDate, creationDate, projectDetails, loading, justSaved]); // When dates, project details, loading state, or justSaved changes
    const handleSaveProject = async () => {
        if (!projectId)
            return;
        try {
            setSaving(true);
            // Сохраняем текущий порядок для сравнения
            const orderBeforeSave = stages.map((s, si) => ({
                stageIndex: si,
                stageId: s.id,
                stageName: s.name,
                tasks: s.tasks.map((t, ti) => ({ taskIndex: ti, taskId: t.id, taskName: t.name }))
            }));
            console.log("Order BEFORE save:", orderBeforeSave);
            // Map local stages to API payload
            // Создаем маппинг ID -> позиция для этапов и задач
            const stageIdToIndex = new Map();
            stages.forEach((stage, index) => {
                stageIdToIndex.set(stage.id, index);
            });
            const taskIdToIndex = new Map();
            stages.forEach((stage, stageIndex) => {
                stage.tasks.forEach((task, taskIndex) => {
                    taskIdToIndex.set(task.id, { stageIndex, taskIndex });
                });
            });
            const payload = stages.map((s, stageIndex) => ({
                name: s.name,
                duration: s.duration,
                is_completed: s.isCompleted,
                responsibles: s.responsibles || [],
                feedback: s.feedback,
                // Преобразуем зависимости этапов: ID -> позиция в массиве (для маппинга на бэкенде)
                dependencies: (s.dependencies || []).map(depId => stageIdToIndex.get(depId) ?? -1).filter(idx => idx !== -1),
                tasks: s.tasks.map((t, taskIndex) => ({
                    name: t.name,
                    duration: t.duration,
                    is_completed: t.isCompleted,
                    responsibles: t.responsibles || [],
                    feedback: t.feedback,
                    // Преобразуем зависимости задач: ID -> позиция
                    // Используем формулу: stage_index * 10000 + task_index для задач
                    // Используем отрицательные числа для этапов: -(stage_index + 1)
                    dependencies: (t.dependencies || []).map(depId => {
                        // Сначала проверяем, является ли это задачей
                        const taskInfo = taskIdToIndex.get(depId);
                        if (taskInfo) {
                            // Это задача - используем формулу stage_index * 10000 + task_index
                            return taskInfo.stageIndex * 10000 + taskInfo.taskIndex;
                        }
                        // Проверяем, является ли это этапом
                        const stageDepIndex = stageIdToIndex.get(depId);
                        if (stageDepIndex !== undefined) {
                            // Это этап - используем отрицательное число
                            return -(stageDepIndex + 1);
                        }
                        return -999999; // Не найдено
                    }).filter(idx => idx !== -999999)
                }))
            }));
            await projectsApi.updateStages(Number(projectId), payload);
            // После успешного сохранения НЕ меняем состояние вообще - ничего не делаем
            // Текущий порядок и все данные остаются как есть
            // Даты уже пересчитаны в текущем состоянии, поэтому ничего делать не нужно
            // Устанавливаем флаг, что только что сохранили, чтобы useEffect не сработал
            setJustSaved(true);
            // Через небольшую задержку сбрасываем флаг (чтобы useEffect мог сработать при других изменениях)
            setTimeout(() => {
                setJustSaved(false);
            }, 2000);
            alert("Проект успешно сохранен!");
        }
        catch (error) {
            console.error("Failed to save project", error);
            console.error("Error details:", {
                message: error?.message,
                response: error?.response?.data,
                status: error?.response?.status,
                stack: error?.stack
            });
            const errorMessage = error?.response?.data?.detail || error?.message || "Неизвестная ошибка";
            alert(`Ошибка при сохранении: ${errorMessage}`);
        }
        finally {
            setSaving(false);
        }
    };
    const openStageModal = (stage) => {
        setModalConfig({
            isOpen: true,
            entity: "stage",
            editingStageId: stage?.id,
            initialValues: stage
                ? {
                    name: stage.name,
                    responsibles: stage.responsibles,
                    duration: stage.duration,
                    feedback: stage.feedback
                }
                : undefined
        });
    };
    const openTaskModal = (stageId, task) => {
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
                    feedback: task.feedback
                }
                : undefined
        });
    };
    const closeModal = () => {
        setModalConfig({ isOpen: false, entity: "stage" });
    };
    const handleStageTaskSubmit = (values) => {
        if (modalConfig.entity === "stage") {
            if (modalConfig.editingStageId) {
                setStages((prev) => {
                    const updated = prev.map((stage) => stage.id === modalConfig.editingStageId
                        ? {
                            ...stage,
                            name: values.name,
                            responsibles: values.responsibles,
                            duration: values.duration,
                            feedback: values.feedback,
                            dependencies: stage.dependencies || [] // Сохраняем зависимости при редактировании
                        }
                        : stage);
                    return recalculateDates(updated);
                });
            }
            else {
                const newStage = {
                    id: Date.now(), // Временный ID
                    name: values.name,
                    responsibles: values.responsibles,
                    duration: values.duration,
                    feedback: values.feedback,
                    isCompleted: false,
                    tasks: [],
                    dependencies: [] // Инициализируем пустым массивом
                };
                setStages((prev) => {
                    const updated = [...prev, newStage];
                    return recalculateDates(updated);
                });
            }
        }
        else if (modalConfig.parentStageId) {
            setStages((prev) => {
                const updated = prev.map((stage) => {
                    if (stage.id !== modalConfig.parentStageId) {
                        return stage;
                    }
                    if (modalConfig.editingTaskId) {
                        return {
                            ...stage,
                            tasks: stage.tasks.map((task) => task.id === modalConfig.editingTaskId
                                ? {
                                    ...task,
                                    name: values.name,
                                    responsibles: values.responsibles,
                                    duration: values.duration,
                                    feedback: values.feedback,
                                    dependencies: task.dependencies || [] // Сохраняем зависимости при редактировании
                                }
                                : task)
                        };
                    }
                    const newTask = {
                        id: Date.now(), // Временный ID
                        name: values.name,
                        responsibles: values.responsibles,
                        duration: values.duration,
                        feedback: values.feedback,
                        isCompleted: false,
                        dependencies: [] // Инициализируем пустым массивом
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
    const handleDeleteStage = (stageId) => {
        // eslint-disable-next-line no-alert
        if (window.confirm("Удалить этап и все его задачи?")) {
            setStages((prev) => prev.filter((stage) => stage.id !== stageId));
        }
    };
    const handleDeleteTask = (stageId, taskId) => {
        // eslint-disable-next-line no-alert
        if (window.confirm("Удалить задачу?")) {
            setStages((prev) => prev.map((stage) => stage.id === stageId ? { ...stage, tasks: stage.tasks.filter((task) => task.id !== taskId) } : stage));
        }
    };
    const toggleStageCompletion = (stageId) => {
        setStages((prev) => prev.map((stage) => stage.id === stageId
            ? {
                ...stage,
                isCompleted: !stage.isCompleted
            }
            : stage));
    };
    const toggleTaskCompletion = (stageId, taskId) => {
        setStages((prev) => prev.map((stage) => stage.id === stageId
            ? {
                ...stage,
                tasks: stage.tasks.map((task) => task.id === taskId
                    ? {
                        ...task,
                        isCompleted: !task.isCompleted
                    }
                    : task)
            }
            : stage));
    };
    const updateStageDependencies = (stageId, dependencyIds) => {
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
                            const newMaxDepIndex = Math.max(...deps
                                .map((depId) => updated.findIndex((s) => s.id === depId))
                                .filter((idx) => idx !== -1));
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
    const updateTaskDependencies = (stageId, taskId, dependencyIds) => {
        setStages((prev) => {
            const deps = Array.isArray(dependencyIds) ? dependencyIds : [];
            const updated = prev.map((stage) => {
                if (stage.id !== stageId) {
                    return stage;
                }
                let updatedTasks = stage.tasks.map((task) => task.id === taskId ? { ...task, dependencies: deps } : task);
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
                                const newMaxTaskDepIndex = Math.max(...deps
                                    .map((depId) => {
                                    const depTask = updatedTasks.find((t) => t.id === depId);
                                    return depTask ? updatedTasks.findIndex((t) => t.id === depId) : -1;
                                })
                                    .filter((idx) => idx !== -1));
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
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverTarget, setDragOverTarget] = useState(null);
    const handleDragStart = (e, type, id, stageId) => {
        setDraggedItem({ type, id, stageId });
        e.dataTransfer.effectAllowed = "link";
        if (e.dataTransfer) {
            e.dataTransfer.setData("text/plain", "");
        }
    };
    const handleDragOver = (e, type, id, stageId) => {
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
    const handleDrop = (e, targetType, targetId, targetStageId) => {
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
        }
        else if (targetType === "task" && targetStageId) {
            const stage = stages.find((s) => s.id === targetStageId);
            const task = stage?.tasks.find((t) => t.id === targetId);
            const currentDeps = task?.dependencies || [];
            let newDeps;
            if (draggedItem.type === "task" && draggedItem.stageId === targetStageId) {
                newDeps = [...currentDeps.filter((d) => d !== draggedItem.id), draggedItem.id];
            }
            else if (draggedItem.type === "stage") {
                const draggedStage = stages.find((s) => s.id === draggedItem.id);
                const stageTaskIds = draggedStage?.tasks.map((t) => t.id) || [];
                newDeps = [...currentDeps.filter((d) => !stageTaskIds.includes(d)), ...stageTaskIds];
            }
            else {
                newDeps = currentDeps;
            }
            updateTaskDependencies(targetStageId, targetId, newDeps);
        }
        setDraggedItem(null);
    };
    const renderStageRow = (stage) => {
        const startDate = stage.startDate ? new Date(stage.startDate) : undefined;
        const endDate = stage.endDate ? new Date(stage.endDate) : undefined;
        const { columnStart, span } = getBarPosition(startDate, endDate, creationDate, dateRange.length);
        const isDragging = draggedItem?.type === "stage" && draggedItem.id === stage.id;
        const isDragOver = dragOverTarget?.type === "stage" && dragOverTarget.id === stage.id;
        return (_jsxs("div", { className: "gantt-row", style: { gridTemplateColumns: gridTemplate }, children: [_jsx("div", { className: "gantt-label-cell", children: _jsxs("div", { className: "stage-row-content", draggable: true, onDragStart: (e) => handleDragStart(e, "stage", stage.id), onDragOver: (e) => handleDragOver(e, "stage", stage.id), onDragLeave: handleDragLeave, onDrop: (e) => handleDrop(e, "stage", stage.id), style: {
                            opacity: isDragging ? 0.5 : 1,
                            background: isDragOver ? "rgba(59, 130, 246, 0.1)" : "transparent",
                            borderRadius: "8px",
                            padding: "0.25rem",
                            cursor: "grab"
                        }, children: [_jsxs("div", { style: { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }, children: [_jsx("input", { type: "checkbox", checked: stage.isCompleted, onChange: (e) => {
                                            e.stopPropagation();
                                            toggleStageCompletion(stage.id);
                                        }, onClick: (e) => e.stopPropagation(), style: { cursor: "pointer", width: "18px", height: "18px" } }), _jsxs("span", { style: { fontWeight: 600, color: "#0f172a", cursor: "pointer", flex: 1, minWidth: "120px" }, onClick: () => openStageModal(stage), children: ["\uD83D\uDCC1 ", stage.name] }), _jsxs("div", { style: { display: "flex", gap: "0.35rem", alignItems: "center" }, children: [_jsx("button", { type: "button", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443", onClick: (e) => {
                                                    e.stopPropagation();
                                                    openTaskModal(stage.id);
                                                }, style: {
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
                                                }, children: "+" }), _jsx("button", { type: "button", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u0442\u0430\u043F", className: "danger", onClick: (e) => {
                                                    e.stopPropagation();
                                                    handleDeleteStage(stage.id);
                                                }, style: {
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
                                                }, children: "\uD83D\uDDD1" })] })] }), stage.feedback && (_jsx("div", { style: { color: "#475569", fontSize: "0.85rem", marginTop: "0.25rem", paddingLeft: "28px" }, children: stage.feedback }))] }) }), _jsx("div", { className: "responsible-cell", children: renderResponsibles(stage.responsibles) }), _jsx("div", { className: "gantt-grid", style: { gridTemplateColumns: `repeat(${dateRange.length}, 70px)` }, children: _jsx("div", { className: `gantt-bar stage${stage.isCompleted ? " completed" : ""}`, style: { gridColumn: `${columnStart} / span ${span}` }, "data-gantt-type": "stage", "data-gantt-id": stage.id, onClick: () => openStageModal(stage), children: _jsxs("span", { children: [stage.duration, " \u0434\u043D."] }) }) })] }, `stage-${stage.id}`));
    };
    const renderTaskRow = (stage, task) => {
        const startDate = task.startDate ? new Date(task.startDate) : undefined;
        const endDate = task.endDate ? new Date(task.endDate) : undefined;
        const { columnStart, span } = getBarPosition(startDate, endDate, creationDate, dateRange.length);
        const isDragging = draggedItem?.type === "task" && draggedItem.id === task.id && draggedItem.stageId === stage.id;
        const isDragOver = dragOverTarget?.type === "task" && dragOverTarget.id === task.id && dragOverTarget.stageId === stage.id;
        return (_jsxs("div", { className: "gantt-row", style: { gridTemplateColumns: gridTemplate }, children: [_jsx("div", { className: "gantt-label-cell task", children: _jsxs("div", { className: "task-row-content", draggable: true, onDragStart: (e) => handleDragStart(e, "task", task.id, stage.id), onDragOver: (e) => handleDragOver(e, "task", task.id, stage.id), onDragLeave: handleDragLeave, onDrop: (e) => handleDrop(e, "task", task.id, stage.id), style: {
                            opacity: isDragging ? 0.5 : 1,
                            background: isDragOver ? "rgba(59, 130, 246, 0.1)" : "transparent",
                            borderRadius: "8px",
                            padding: "0.25rem",
                            cursor: "grab"
                        }, children: [_jsxs("div", { style: { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }, children: [_jsx("input", { type: "checkbox", checked: task.isCompleted, onChange: (e) => {
                                            e.stopPropagation();
                                            toggleTaskCompletion(stage.id, task.id);
                                        }, onClick: (e) => e.stopPropagation(), style: { cursor: "pointer", width: "18px", height: "18px" } }), _jsxs("span", { style: { fontWeight: 500, color: "#0f172a", cursor: "pointer", flex: 1, minWidth: "120px" }, onClick: () => openTaskModal(stage.id, task), children: ["\u21B3 ", task.name] }), _jsx("button", { type: "button", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443", className: "danger", onClick: (e) => {
                                            e.stopPropagation();
                                            handleDeleteTask(stage.id, task.id);
                                        }, style: {
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
                                        }, children: "\uD83D\uDDD1" })] }), task.feedback && (_jsx("div", { style: { color: "#475569", fontSize: "0.85rem", marginTop: "0.25rem", paddingLeft: "28px" }, children: task.feedback }))] }) }), _jsx("div", { className: "responsible-cell", children: renderResponsibles(task.responsibles) }), _jsx("div", { className: "gantt-grid", style: { gridTemplateColumns: `repeat(${dateRange.length}, 70px)` }, children: _jsx("div", { className: `gantt-bar task${task.isCompleted ? " completed" : ""}`, style: { gridColumn: `${columnStart} / span ${span}` }, "data-gantt-type": "task", "data-gantt-id": task.id, onClick: () => openTaskModal(stage.id, task), children: _jsxs("span", { children: [task.duration, " \u0434\u043D."] }) }) })] }, `task-${task.id}`));
    };
    const buildRoundedFourTurnPath = (from, to) => {
        const startX = from.right;
        const startY = (from.top + from.bottom) / 2;
        // End slightly INSIDE the target bar, so the arrowhead doesn't sit on top like a "play" button.
        const endX = to.left + 6;
        const endY = (to.top + to.bottom) / 2;
        // Route with 4 turns (as requested):
        // 1) slightly right from the source
        // 2) down under the source
        // 3) left under the source
        // 4) down to the target's mid Y
        // 5) right into the target start
        const r = 8; // corner radius
        const out = 14; // initial horizontal nudge from the source
        const gapUnderSource = 18;
        const underSourceY = from.bottom + gapUnderSource;
        // Keep the "left corridor" safely to the left of the target start, so last segment goes right into it.
        const leftCorridorX = Math.min(startX + out, endX - 28);
        const q = (cx, cy, x, y) => `Q ${cx} ${cy} ${x} ${y}`;
        // Build with rounded corners (single quadratic at each turn)
        return [
            // start -> right
            `M ${startX} ${startY}`,
            `L ${startX + out - r} ${startY}`,
            q(startX + out, startY, startX + out, startY + r),
            // down under source
            `L ${startX + out} ${underSourceY - r}`,
            q(startX + out, underSourceY, startX + out - r, underSourceY),
            // left under source
            `L ${leftCorridorX + r} ${underSourceY}`,
            q(leftCorridorX, underSourceY, leftCorridorX, underSourceY + r),
            // down to target mid
            `L ${leftCorridorX} ${endY - r}`,
            q(leftCorridorX, endY, leftCorridorX + r, endY),
            // right into target start (slightly inside)
            `L ${endX} ${endY}`
        ].join(" ");
    };
    const recomputeDependencyOverlay = useCallback(() => {
        const tableEl = ganttTableRef.current;
        if (!tableEl)
            return;
        const tableRect = tableEl.getBoundingClientRect();
        const width = Math.ceil(tableEl.scrollWidth);
        const height = Math.ceil(tableEl.scrollHeight);
        setDepsSvgSize({ width, height });
        const nodes = Array.from(tableEl.querySelectorAll(".gantt-bar[data-gantt-type][data-gantt-id]"));
        const rectByKey = new Map();
        for (const el of nodes) {
            const type = el.dataset.ganttType;
            const idStr = el.dataset.ganttId;
            if (!type || !idStr)
                continue;
            const rect = el.getBoundingClientRect();
            rectByKey.set(`${type}:${idStr}`, {
                left: rect.left - tableRect.left,
                top: rect.top - tableRect.top,
                right: rect.right - tableRect.left,
                bottom: rect.bottom - tableRect.top
            });
        }
        const nextPaths = [];
        for (const stage of stages) {
            const stageKey = `stage:${stage.id}`;
            const stageRect = rectByKey.get(stageKey);
            if (stageRect && stage.dependencies?.length) {
                for (const depId of stage.dependencies) {
                    const fromKey = `stage:${depId}`;
                    const fromRect = rectByKey.get(fromKey);
                    if (!fromRect)
                        continue;
                    nextPaths.push({
                        key: `s:${depId}->${stage.id}`,
                        d: buildRoundedFourTurnPath(fromRect, stageRect),
                        stroke: "rgba(14, 165, 233, 0.75)"
                    });
                }
            }
            for (const task of stage.tasks) {
                const taskKey = `task:${task.id}`;
                const taskRect = rectByKey.get(taskKey);
                if (!taskRect || !task.dependencies?.length)
                    continue;
                for (const depId of task.dependencies) {
                    const fromTaskKey = `task:${depId}`;
                    const fromStageKey = `stage:${depId}`;
                    const fromRect = rectByKey.get(fromTaskKey) ?? rectByKey.get(fromStageKey);
                    if (!fromRect)
                        continue;
                    nextPaths.push({
                        key: `t:${depId}->${task.id}`,
                        d: buildRoundedFourTurnPath(fromRect, taskRect),
                        stroke: "rgba(16, 185, 129, 0.75)"
                    });
                }
            }
        }
        setDepsPaths(nextPaths);
    }, [stages]);
    useLayoutEffect(() => {
        recomputeDependencyOverlay();
    }, [recomputeDependencyOverlay, dateRange.length, gridTemplate]);
    useEffect(() => {
        const onResize = () => recomputeDependencyOverlay();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [recomputeDependencyOverlay]);
    if (loading) {
        return (_jsx("div", { style: { paddingTop: "80px", minHeight: "100vh", display: "flex", justifyContent: "center" }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }));
    }
    if (!projectDetails) {
        return (_jsx("div", { style: { paddingTop: "80px", textAlign: "center" }, children: "\u041F\u0440\u043E\u0435\u043A\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" }));
    }
    return (_jsxs("div", { style: { paddingTop: "80px", minHeight: "100vh", display: "flex", flexDirection: "column" }, children: [_jsx(Header, {}), _jsxs("div", { style: { flex: 1, padding: "1.5rem 2rem 2rem", width: "100%" }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [_jsx("button", { onClick: () => navigate(-1), style: {
                                    marginBottom: "1.5rem",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(148, 163, 184, 0.35)",
                                    background: "white",
                                    color: "#475569",
                                    fontSize: "0.9rem",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                }, children: "\u2190 \u041D\u0430\u0437\u0430\u0434" }), _jsx("button", { onClick: handleSaveProject, disabled: saving, style: {
                                    padding: "0.75rem 1.5rem",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: saving ? "#94a3b8" : "linear-gradient(135deg, #10b981, #059669)",
                                    color: "white",
                                    fontSize: "1rem",
                                    fontWeight: 600,
                                    cursor: saving ? "wait" : "pointer",
                                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
                                }, children: saving ? "Сохранение..." : "Сохранить изменения" })] }), _jsxs("div", { style: { marginBottom: "1.5rem" }, children: [_jsx("h1", { style: { fontSize: "2rem", color: "#1d4ed8", marginBottom: "0.5rem" }, children: projectDetails.name }), _jsxs("p", { style: { color: "#475569" }, children: ["\u041A\u043E\u043C\u0430\u043D\u0434\u0430: ", teamName] }), _jsxs("p", { style: { color: "#94a3b8", fontSize: "0.9rem" }, children: ["\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u043F\u0440\u043E\u0435\u043A\u0442\u0430: ", durationDays, " \u0434\u043D. (\u0441 ", creationDate.toLocaleDateString("ru-RU"), " \u043F\u043E ", deadlineDate.toLocaleDateString("ru-RU"), ")"] })] }), _jsx("div", { className: "gantt-wrapper", style: { position: "relative" }, children: _jsxs("div", { className: "gantt-table", ref: ganttTableRef, children: [depsSvgSize.width > 0 && depsSvgSize.height > 0 && (_jsxs("svg", { className: "gantt-deps-overlay", width: depsSvgSize.width, height: depsSvgSize.height, viewBox: `0 0 ${depsSvgSize.width} ${depsSvgSize.height}`, preserveAspectRatio: "none", children: [_jsx("defs", { children: _jsx("marker", { id: "ganttArrow", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "8", markerHeight: "8", orient: "auto-start-reverse", children: _jsx("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "rgba(30, 41, 59, 0.55)" }) }) }), depsPaths.map((p) => (_jsx("path", { d: p.d, fill: "none", stroke: p.stroke, strokeWidth: 2, markerEnd: "url(#ganttArrow)", strokeLinecap: "round", strokeLinejoin: "round" }, p.key)))] })), _jsxs("div", { className: "gantt-header-row", style: { gridTemplateColumns: gridTemplate }, children: [_jsx("div", { className: "gantt-header-cell label", children: "\u042D\u0442\u0430\u043F\u044B / \u0437\u0430\u0434\u0430\u0447\u0438" }), _jsx("div", { className: "gantt-header-cell label", children: "\u041E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435" }), dateRange.map((date) => {
                                            const today = new Date();
                                            const isToday = isSameLocalDay(date, today);
                                            return (_jsxs("div", { className: `gantt-header-cell${isToday ? " today" : ""}`, children: [_jsx("div", { className: "gantt-header-weekday", style: { textTransform: "capitalize" }, children: formatWeekday(date) }), _jsxs("div", { className: "gantt-header-day", children: [_jsx("strong", { children: date.getDate() }), isToday && _jsx("span", { className: "gantt-today-dot", "aria-hidden": "true" })] })] }, date.toISOString()));
                                        })] }), _jsxs("div", { className: "gantt-row", style: { gridTemplateColumns: gridTemplate }, children: [_jsx("div", { className: "gantt-label-cell", children: _jsxs("div", { style: { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }, children: [_jsxs("span", { style: { fontWeight: 600, color: "#0f172a", flex: 1, minWidth: "120px" }, children: ["\uD83D\uDCC1 ", projectDetails.name] }), _jsx("button", { title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u044D\u0442\u0430\u043F", onClick: () => openStageModal(), style: {
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
                                                        }, children: "+" })] }) }), _jsx("div", { className: "responsible-cell", children: _jsx("span", { className: "responsible-chip ghost", children: "\u0412\u0441\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u0430" }) }), _jsx("div", { className: "gantt-grid", style: { gridTemplateColumns: `repeat(${dateRange.length}, 70px)` }, children: _jsx("div", { className: "gantt-bar project", style: { gridColumn: `1 / span ${dateRange.length}` }, onClick: () => openStageModal(), children: _jsxs("span", { children: [durationDays, " \u0434\u043D."] }) }) })] }), stages.map((stage) => (_jsxs(Fragment, { children: [renderStageRow(stage), stage.tasks.map((task) => renderTaskRow(stage, task))] }, stage.id)))] }) })] }), _jsx(StageTaskModal, { isOpen: modalConfig.isOpen, entityLabel: modalConfig.entity === "stage" ? "этап" : "задачу", teamMembers: teamMembers, onClose: closeModal, onSubmit: handleStageTaskSubmit, initialValues: modalConfig.initialValues })] }));
};
