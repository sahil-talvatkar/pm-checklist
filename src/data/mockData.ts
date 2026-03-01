import { PMTask, HistoryRecord, Notification } from "../types/pm";
import { format, subDays, subHours, subMinutes } from "date-fns";

const today = format(new Date(), "yyyy-MM-dd");
const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
const twoDaysAgo = format(subDays(new Date(), 2), "yyyy-MM-dd");
const threeDaysAgo = format(subDays(new Date(), 3), "yyyy-MM-dd");
const fourDaysAgo = format(subDays(new Date(), 4), "yyyy-MM-dd");
const fiveDaysAgo = format(subDays(new Date(), 5), "yyyy-MM-dd");
const sixDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

export const mockPMTasks: PMTask[] = [
  {
    PM_ID: "PM-001",
    Equipment_Name: "Air Compressor Unit A",
    PM_Task:
      "Check and replace air filter, inspect belts and hoses, verify pressure levels",
    Due_Date: today,
    Status: "Pending",
    Completed_By: "",
    Completed_On: "",
    Comment: "",
  },
  {
    PM_ID: "PM-002",
    Equipment_Name: "CNC Machine #3",
    PM_Task:
      "Lubricate all moving parts, inspect spindle, clean coolant reservoir",
    Due_Date: today,
    Status: "Pending",
    Completed_By: "",
    Completed_On: "",
    Comment: "",
  },
  {
    PM_ID: "PM-003",
    Equipment_Name: "Hydraulic Press Station",
    PM_Task:
      "Check hydraulic fluid level, inspect seals and connections, test pressure relief valve",
    Due_Date: today,
    Status: "Completed",
    Completed_By: "John Smith",
    Completed_On: today,
    Comment: "All checks passed. Fluid topped up.",
  },
  {
    PM_ID: "PM-004",
    Equipment_Name: "Industrial HVAC Unit",
    PM_Task:
      "Clean/replace filters, inspect condenser coils, check refrigerant levels",
    Due_Date: today,
    Status: "Pending",
    Completed_By: "",
    Completed_On: "",
    Comment: "",
  },
  {
    PM_ID: "PM-005",
    Equipment_Name: "Conveyor Belt System",
    PM_Task:
      "Inspect belt tension and alignment, lubricate rollers, check drive motor",
    Due_Date: yesterday,
    Status: "Overdue",
    Completed_By: "",
    Completed_On: "",
    Comment: "",
  },
  {
    PM_ID: "PM-006",
    Equipment_Name: "Electrical Panel Room",
    PM_Task:
      "Inspect breakers, check thermal imaging, tighten connections, update log",
    Due_Date: today,
    Status: "Pending",
    Completed_By: "",
    Completed_On: "",
    Comment: "",
  },
  {
    PM_ID: "PM-007",
    Equipment_Name: "Water Cooling Tower",
    PM_Task:
      "Test water chemistry, clean fill media, inspect fan blades and motor",
    Due_Date: yesterday,
    Status: "Overdue",
    Completed_By: "",
    Completed_On: "",
    Comment: "",
  },
  {
    PM_ID: "PM-008",
    Equipment_Name: "Diesel Generator Set",
    PM_Task:
      "Check fuel level, test start sequence, inspect exhaust system, check battery",
    Due_Date: today,
    Status: "Completed",
    Completed_By: "Maria Garcia",
    Completed_On: today,
    Comment: "Generator tested successfully. Battery voltage normal.",
  },
  {
    PM_ID: "PM-009",
    Equipment_Name: "Boiler Unit B",
    PM_Task:
      "Check steam pressure, inspect burner assembly, test safety valves",
    Due_Date: today,
    Status: "Pending",
    Completed_By: "",
    Completed_On: "",
    Comment: "",
  },
  {
    PM_ID: "PM-010",
    Equipment_Name: "Robotic Welding Cell",
    PM_Task:
      "Inspect wire feeder, clean welding torch, calibrate robot arm positions",
    Due_Date: today,
    Status: "Pending",
    Completed_By: "",
    Completed_On: "",
    Comment: "",
  },
];

export const mockHistoryRecords: HistoryRecord[] = [
  {
    id: "H-001",
    PM_ID: "PM-003",
    Equipment_Name: "Hydraulic Press Station",
    PM_Task: "Check hydraulic fluid level, inspect seals and connections, test pressure relief valve",
    Due_Date: today,
    Completed_On: today,
    Completed_By: "John Smith",
    Comment: "All checks passed. Fluid topped up.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm:ss"),
  },
  {
    id: "H-002",
    PM_ID: "PM-008",
    Equipment_Name: "Diesel Generator Set",
    PM_Task: "Check fuel level, test start sequence, inspect exhaust system, check battery",
    Due_Date: today,
    Completed_On: today,
    Completed_By: "Maria Garcia",
    Comment: "Generator tested successfully. Battery voltage normal.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subHours(new Date(), 4), "yyyy-MM-dd'T'HH:mm:ss"),
  },
  {
    id: "H-003",
    PM_ID: "PM-011",
    Equipment_Name: "Vacuum Pump System",
    PM_Task: "Inspect pump seals, check oil level, verify vacuum gauge readings",
    Due_Date: yesterday,
    Completed_On: yesterday,
    Completed_By: "Carlos Rivera",
    Comment: "Oil level was low, refilled. Seals in good condition.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss").replace("T", "T08:30:"),
  },
  {
    id: "H-004",
    PM_ID: "PM-012",
    Equipment_Name: "Cooling Water Pump",
    PM_Task: "Check bearing temperature, inspect shaft seals, measure flow rate",
    Due_Date: yesterday,
    Completed_On: yesterday,
    Completed_By: "Aisha Patel",
    Comment: "Bearing temp normal. Flow rate 98% of nominal.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss").replace("T", "T10:15:"),
  },
  {
    id: "H-005",
    PM_ID: "PM-013",
    Equipment_Name: "Overhead Crane #2",
    PM_Task: "Lubricate crane rails, inspect hook and chain, test limit switches",
    Due_Date: twoDaysAgo,
    Completed_On: twoDaysAgo,
    Completed_By: "James Wilson",
    Comment: "All limit switches functional. Applied fresh grease to rails.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 2), "yyyy-MM-dd'T'09:45:00"),
  },
  {
    id: "H-006",
    PM_ID: "PM-014",
    Equipment_Name: "Paint Spray Booth",
    PM_Task: "Replace exhaust filters, clean spray guns, check ventilation flow",
    Due_Date: twoDaysAgo,
    Completed_On: twoDaysAgo,
    Completed_By: "Lin Wei",
    Comment: "Filters replaced. Ventilation at 100% capacity.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 2), "yyyy-MM-dd'T'14:20:00"),
  },
  {
    id: "H-007",
    PM_ID: "PM-015",
    Equipment_Name: "Lathe Machine #1",
    PM_Task: "Check spindle bearings, calibrate tailstock, clean chip conveyor",
    Due_Date: threeDaysAgo,
    Completed_On: threeDaysAgo,
    Completed_By: "Tom Bradley",
    Comment: "Calibration completed. Chip conveyor thoroughly cleaned.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 3), "yyyy-MM-dd'T'11:00:00"),
  },
  {
    id: "H-008",
    PM_ID: "PM-016",
    Equipment_Name: "Air Compressor Unit B",
    PM_Task: "Drain condensate, check pressure switches, inspect safety relief valve",
    Due_Date: threeDaysAgo,
    Completed_On: threeDaysAgo,
    Completed_By: "Sara Ahmed",
    Comment: "Safety relief valve tested and certified. Condensate drained.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 3), "yyyy-MM-dd'T'15:30:00"),
  },
  {
    id: "H-009",
    PM_ID: "PM-017",
    Equipment_Name: "Industrial Robot Arm",
    PM_Task: "Lubricate joints, check axis alignment, update firmware if available",
    Due_Date: fourDaysAgo,
    Completed_On: fourDaysAgo,
    Completed_By: "John Smith",
    Comment: "All 6 axes lubricated. Firmware updated to v2.3.1.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 4), "yyyy-MM-dd'T'09:00:00"),
  },
  {
    id: "H-010",
    PM_ID: "PM-018",
    Equipment_Name: "Forklift Unit #3",
    PM_Task: "Check tyre pressure, inspect forks, test horn and lights, check fluid levels",
    Due_Date: fourDaysAgo,
    Completed_On: fourDaysAgo,
    Completed_By: "Maria Garcia",
    Comment: "All safety checks passed. Tyre pressure adjusted.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 4), "yyyy-MM-dd'T'13:45:00"),
  },
  {
    id: "H-011",
    PM_ID: "PM-019",
    Equipment_Name: "Welding Machine #5",
    PM_Task: "Check wire feed speed, inspect ground clamps, clean spatter from nozzle",
    Due_Date: fiveDaysAgo,
    Completed_On: fiveDaysAgo,
    Completed_By: "Carlos Rivera",
    Comment: "Wire feed speed calibrated. Nozzle cleaned and anti-spatter applied.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 5), "yyyy-MM-dd'T'10:30:00"),
  },
  {
    id: "H-012",
    PM_ID: "PM-020",
    Equipment_Name: "Dust Collector System",
    PM_Task: "Shake filter bags, empty dust hoppers, check fan motor amperage",
    Due_Date: fiveDaysAgo,
    Completed_On: fiveDaysAgo,
    Completed_By: "Aisha Patel",
    Comment: "Filter bags cleaned. Fan motor drawing 4.2A (within spec).",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 5), "yyyy-MM-dd'T'14:00:00"),
  },
  {
    id: "H-013",
    PM_ID: "PM-021",
    Equipment_Name: "CNC Machine #1",
    PM_Task: "Tool changer inspection, lubricate ATC magazine, run tool length measurement",
    Due_Date: sixDaysAgo,
    Completed_On: sixDaysAgo,
    Completed_By: "James Wilson",
    Comment: "ATC magazine serviced. 24 tools measured and offset values updated.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 6), "yyyy-MM-dd'T'08:00:00"),
  },
  {
    id: "H-014",
    PM_ID: "PM-022",
    Equipment_Name: "Boiler Unit A",
    PM_Task: "Check water level, test low water cut-off, inspect burner flame",
    Due_Date: sixDaysAgo,
    Completed_On: sixDaysAgo,
    Completed_By: "Lin Wei",
    Comment: "Low water cut-off tested successfully. Burner flame adjusted for optimal combustion.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 6), "yyyy-MM-dd'T'11:30:00"),
  },
  {
    id: "H-015",
    PM_ID: "PM-023",
    Equipment_Name: "Emergency Generator",
    PM_Task: "Weekly auto-start test, check coolant level, inspect exhaust",
    Due_Date: sevenDaysAgo,
    Completed_On: sevenDaysAgo,
    Completed_By: "Tom Bradley",
    Comment: "Generator auto-started successfully. Run time 15 minutes. All readings normal.",
    Status: "Completed",
    action: "Task Completed",
    timestamp: format(subDays(new Date(), 7), "yyyy-MM-dd'T'09:15:00"),
  },
];

export const generateNotifications = (tasks: PMTask[]): Notification[] => {
  const notifications: Notification[] = [];
  const now = new Date();

  const overdueTasks = tasks.filter((t) => t.Status === "Overdue");
  const pendingTasks = tasks.filter((t) => t.Status === "Pending");
  const completedTasks = tasks.filter((t) => t.Status === "Completed");

  overdueTasks.forEach((task, i) => {
    notifications.push({
      id: `notif-overdue-${task.PM_ID}`,
      type: "overdue",
      title: "⚠️ Overdue PM Task",
      message: `${task.Equipment_Name} — ${task.PM_Task.substring(0, 60)}...`,
      PM_ID: task.PM_ID,
      Equipment_Name: task.Equipment_Name,
      timestamp: format(subMinutes(now, (i + 1) * 10), "yyyy-MM-dd'T'HH:mm:ss"),
      read: false,
    });
  });

  if (pendingTasks.length > 0) {
    notifications.push({
      id: "notif-pending-summary",
      type: "pending",
      title: "📋 Pending Tasks Reminder",
      message: `You have ${pendingTasks.length} pending PM task${pendingTasks.length > 1 ? "s" : ""} due today that require attention.`,
      timestamp: format(subMinutes(now, 30), "yyyy-MM-dd'T'HH:mm:ss"),
      read: false,
    });
  }

  completedTasks.slice(0, 2).forEach((task, i) => {
    notifications.push({
      id: `notif-completed-${task.PM_ID}`,
      type: "completed",
      title: "✅ Task Completed",
      message: `${task.Equipment_Name} PM completed by ${task.Completed_By}.`,
      PM_ID: task.PM_ID,
      Equipment_Name: task.Equipment_Name,
      timestamp: format(subHours(now, i + 1), "yyyy-MM-dd'T'HH:mm:ss"),
      read: i > 0,
    });
  });

  notifications.push({
    id: "notif-daily-info",
    type: "info",
    title: "📅 Daily PM Schedule Loaded",
    message: `Today's checklist has ${tasks.length} total tasks. ${completedTasks.length} completed, ${pendingTasks.length} pending.`,
    timestamp: format(subHours(now, 5), "yyyy-MM-dd'T'HH:mm:ss"),
    read: true,
  });

  return notifications.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

export const equipmentNames = [
  "All Equipment",
  "Air Compressor Unit A",
  "CNC Machine #3",
  "Hydraulic Press Station",
  "Industrial HVAC Unit",
  "Conveyor Belt System",
  "Electrical Panel Room",
  "Water Cooling Tower",
  "Diesel Generator Set",
  "Boiler Unit B",
  "Robotic Welding Cell",
];
