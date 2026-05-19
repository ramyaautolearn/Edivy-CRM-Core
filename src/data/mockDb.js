// src/data/mockDb.js

export let MOCK_USERS = [
  {
    id: 1,
    name: 'System Admin',
    user_id: 'admin',
    password: 'password',
    role: 'admin',
    status: 'active',
    created_at: new Date(Date.now() - 864000000).toISOString(),
  },
  {
    id: 2,
    name: 'John Doe',
    user_id: 'staff',
    password: 'password',
    role: 'staff',
    status: 'active',
    created_at: new Date(Date.now() - 432000000).toISOString(),
  },
];

export let MOCK_LEADS = [
  {
    id: 101,
    school_name: 'Oakridge International',
    location: 'Gachibowli',
    contact_name: 'Rahul Sharma',
    contact_role: 'Principal',
    phone: '9876543210',
    email: 'rahul@oakridge.edu',
    pc1: 'Elite/Professional',
    pc2: 'Manual WhatsApp',
    pc3: 'Holistic/Life-Skills',
    import_tag: 'Q1_Inbound',
    score: 95,
    engine: 1,
    stage_id: 's1',
    stage_name: '1. Contact Initiation',
    assigned_to: null,
    status: 'active',
    created_at: new Date().toISOString(),
    is_ooc: false,
    last_activity_at: new Date().toISOString(),
    is_locked: false,
    disqualification_reason: null,
    nurture_stage_id: null,
    engagement_status: 'Not Engaged',
    temperature: 'Cold',
    is_nurture_paused: false,
  },
];

export let PIPELINE_VERSIONS = [
  {
    id: 'v1',
    name: 'v1.0 - Adaptive Conversion System',
    status: 'active',
    created_at: new Date().toISOString(),
  },
];

export let PIPELINE_STAGES = [
  {
    id: 's1',
    version_id: 'v1',
    engine: 1,
    name: '1. Contact Initiation',
    order: 1,
  },
  {
    id: 's2',
    version_id: 'v1',
    engine: 1,
    name: '2. Engagement & Qual',
    order: 2,
  },
  {
    id: 's3',
    version_id: 'v1',
    engine: 1,
    name: '3. Realization + Micro Demo',
    order: 3,
  },
  { id: 's4', version_id: 'v1', engine: 1, name: '4. Demo Booking', order: 4 },
  {
    id: 's5',
    version_id: 'v1',
    engine: 1,
    name: '5. Meeting Confirmation',
    order: 5,
  },
  {
    id: 's6',
    version_id: 'v1',
    engine: 1,
    name: '6. Demo Execution',
    order: 6,
  },
  { id: 's7', version_id: 'v1', engine: 1, name: '7. The Close', order: 7 },
  {
    id: 's8',
    version_id: 'v1',
    engine: 1,
    name: '8. Post-Demo Follow-Up',
    order: 8,
  },
];

export let TASK_TEMPLATES = [
  {
    id: 't1_1',
    stage_id: 's1',
    title: 'Send First Message',
    offset_days: 0,
    type: 'whatsapp',
    priority: 2,
    order: 1,
  },
  {
    id: 't1_2',
    stage_id: 's1',
    title: 'Wait & Follow-Up Message',
    offset_days: 0.166,
    type: 'whatsapp',
    priority: 2,
    order: 2,
  },
  {
    id: 't2_1',
    stage_id: 's2',
    title: 'Engagement Question',
    offset_days: 0,
    type: 'whatsapp',
    priority: 3,
    order: 1,
  },
  {
    id: 't2_2',
    stage_id: 's2',
    title: 'CALL TRIGGER: Hot Lead',
    offset_days: 0,
    type: 'call',
    priority: 3,
    order: 2,
  },
  {
    id: 't2_3',
    stage_id: 's2',
    title: 'Cold Insight Message',
    offset_days: 2,
    type: 'whatsapp',
    priority: 1,
    order: 3,
  },
];
export let LEAD_TASKS = [];

export let NURTURE_VERSIONS = [
  {
    id: 'nv1',
    name: 'v1.0 - Delayed Conversion Engine',
    status: 'active',
    created_at: new Date().toISOString(),
  },
];

export let NURTURE_SETTINGS = { min_gap_hours: 48, max_msgs_per_week: 3 };

export let NURTURE_STAGES = [
  {
    id: 'ns1',
    version_id: 'nv1',
    name: '1. Entry & Segmentation',
    is_core: true,
    order: 1,
  },
  {
    id: 'ns2',
    version_id: 'nv1',
    name: '2. Awareness (Week 1)',
    is_core: true,
    order: 2,
  },
  {
    id: 'ns3',
    version_id: 'nv1',
    name: '3. Consideration (Week 2)',
    is_core: true,
    order: 3,
  },
  {
    id: 'ns4',
    version_id: 'nv1',
    name: '4. Soft Engagement (Week 3)',
    is_core: true,
    order: 4,
  },
  {
    id: 'ns5',
    version_id: 'nv1',
    name: '5. Long-Term Nurture',
    is_core: true,
    order: 5,
  },
];

export let NURTURE_ACTIONS = [
  {
    id: 'na1',
    stage_id: 'ns2',
    title: 'Day 1 Reality Drop',
    action_type: 'whatsapp',
    content_type: 'Reality',
    offset_days: 1,
    order: 1,
  },
  {
    id: 'na2',
    stage_id: 'ns2',
    title: 'Day 3 Insight Hook',
    action_type: 'whatsapp',
    content_type: 'Insight',
    offset_days: 3,
    order: 2,
  },
  {
    id: 'na3',
    stage_id: 'ns2',
    title: 'Day 5 Micro Proof',
    action_type: 'whatsapp',
    content_type: 'Proof',
    offset_days: 5,
    order: 3,
  },
  {
    id: 'na4',
    stage_id: 'ns3',
    title: 'Day 8 Insight + Explanation',
    action_type: 'whatsapp',
    content_type: 'Insight',
    offset_days: 8,
    order: 1,
  },
  {
    id: 'na5',
    stage_id: 'ns3',
    title: 'Day 10 Micro Case',
    action_type: 'whatsapp',
    content_type: 'Micro Case',
    offset_days: 10,
    order: 2,
  },
  {
    id: 'na6',
    stage_id: 'ns3',
    title: 'Day 15 Soft Invite',
    action_type: 'whatsapp',
    content_type: 'Invite',
    offset_days: 15,
    order: 1,
  },
];

// --- PRE-LOADED STRUCTURED SCRIPTS ---
export let MOCK_SCRIPTS = [
  // ENGINE 1 - STAGE 1 (Initial Contact)
  {
    id: 'scr_e1_1',
    engine: 1,
    stage_id: 's1',
    message_type: 'Opening',
    pc1: 'Elite/Professional',
    pc2: 'Manual WhatsApp',
    pc3: 'Holistic/Life-Skills',
    priority: 1,
    tone: 'Premium',
    usage_count: 0,
    positive_outcomes: 0,
    content:
      'Hi {contact_name}, noticed {school_name} has a highly engaged parent base, but managing that through manual WhatsApp groups usually creates a 24/7 headache for teachers. We help top-tier schools centralize parent comms so teachers can focus on the classroom. Open to a quick 5-min chat this week?',
  },
  {
    id: 'scr_e1_2',
    engine: 1,
    stage_id: 's1',
    message_type: 'Opening',
    pc1: 'Mass-Market',
    pc2: 'No System',
    pc3: 'Marks-Only',
    priority: 2,
    tone: 'Direct',
    usage_count: 0,
    positive_outcomes: 0,
    content:
      'Hi {contact_name}, quick question—are your teachers spending hours updating parents on marks and attendance manually? We built a simple system that automates this, helping schools boost admissions through better parent reviews. Worth a quick chat to see how it works?',
  },
  {
    id: 'scr_e1_3',
    engine: 1,
    stage_id: 's1',
    message_type: 'Opening',
    pc1: 'Middle-Income',
    pc2: 'Clunky ERP',
    pc3: 'Tech-Forward',
    priority: 3,
    tone: 'Analytical',
    usage_count: 0,
    positive_outcomes: 0,
    content:
      'Hi {contact_name}, saw {school_name} is pushing forward with tech. Many schools using traditional ERPs tell us parents just ignore the app and demand WhatsApp updates anyway. Weve built a bridge that gives you ERP-level control, directly inside WhatsApp. Curious to see a 2-min demo?',
  },

  // ENGINE 1 - STAGE 2 (Engagement)
  {
    id: 'scr_e1_4',
    engine: 1,
    stage_id: 's2',
    message_type: 'Engagement',
    pc1: 'Any',
    pc2: 'Clunky ERP',
    pc3: 'Any',
    priority: 1,
    tone: 'Curious',
    usage_count: 0,
    positive_outcomes: 0,
    content:
      'Question for you {contact_name}—since you are already using an app/ERP, are you actually seeing 90%+ of parents logging in daily, or are teachers still fielding WhatsApp messages on the side?',
  },

  // ENGINE 1 - STAGE 4 (Demo Booking)
  {
    id: 'scr_e1_5',
    engine: 1,
    stage_id: 's4',
    message_type: 'Invite',
    pc1: 'Any',
    pc2: 'Any',
    pc3: 'Any',
    priority: 1,
    tone: 'Low-Friction',
    usage_count: 0,
    positive_outcomes: 0,
    content:
      'Glad you found the video interesting, {contact_name}. It’s much easier to see how it fits your specific setup live. Do you have 10 minutes on Tuesday or Wednesday for a quick screen-share? No hard pitch, just showing you the mechanics.',
  },

  // ENGINE 2 - REALITY DROPS
  {
    id: 'scr_e2_1',
    engine: 2,
    stage_id: 'ns2',
    message_type: 'Reality',
    pc1: 'Elite/Professional',
    pc2: 'Premium Portal',
    pc3: 'Any',
    priority: 1,
    tone: 'Challenging',
    usage_count: 0,
    positive_outcomes: 0,
    content:
      'A hard truth we’re seeing, {contact_name}: You can buy the most expensive school app in the world, but you cant force parents to download it. If they live on WhatsApp, that’s where the school needs to be. Notice this with your parents?',
  },
  {
    id: 'scr_e2_2',
    engine: 2,
    stage_id: 'ns2',
    message_type: 'Reality',
    pc1: 'Mass-Market',
    pc2: 'Manual WhatsApp',
    pc3: 'Any',
    priority: 1,
    tone: 'Direct',
    usage_count: 0,
    positive_outcomes: 0,
    content:
      'Most schools don’t have an enquiry problem, they have a conversion problem. And the #1 reason parents choose another school is "poor communication." Just something to think about as admissions season approaches.',
  },
];

export let MOCK_NOTIFICATIONS = [];
export const OUTCOMES = [
  'Reply Received',
  'No Reply',
  'Interested',
  'Not Now',
  'Meeting Booked',
  'Closed Won',
  'Closed Lost',
];
export const POSITIVE_OUTCOMES = [
  'Reply Received',
  'Interested',
  'Meeting Booked',
  'Closed Won',
];

let usersTable = [...MOCK_USERS];
let leadsTable = [...MOCK_LEADS];
let notificationsTable = [...MOCK_NOTIFICATIONS];

const calculateEdivyScore = (data) => {
  let score = 30;
  if (data.pc1 === 'Elite/Professional') score += 20;
  if (data.pc2 === 'Manual WhatsApp') score += 25;
  if (data.pc3 === 'Holistic/Life-Skills') score += 15;
  return Math.max(0, score);
};
const calculateSLA = (lead, tasks) => {
  if (lead.status === 'lost' || lead.status === 'won' || lead.engine === 2)
    return 'neutral';
  const leadTasks = tasks.filter(
    (t) => t.lead_id === lead.id && t.status === 'pending'
  );
  const today = new Date().toISOString().split('T')[0];
  if (leadTasks.some((t) => t.due_date.split('T')[0] < today))
    return 'breached';
  return 'healthy';
};

const instantiateTasksForStage = (leadId, stageId) => {
  const templates = TASK_TEMPLATES.filter((t) => t.stage_id === stageId);
  const now = new Date();
  templates.forEach((t) => {
    const dueDate = new Date(
      now.getTime() + t.offset_days * 24 * 60 * 60 * 1000
    );
    LEAD_TASKS.push({
      id: `lt_${Date.now()}_${Math.random()}`,
      lead_id: leadId,
      template_id: t.id,
      title: t.title,
      type: t.type,
      is_mandatory: t.is_mandatory,
      status: 'pending',
      due_date: dueDate.toISOString(),
      priority: t.priority,
    });
  });
};

const simulateNurtureScheduling = (lead, activeVersionId) => {
  let timingMultiplier = 1.0;
  if (
    lead.temperature === 'Warm' ||
    lead.import_tag?.toLowerCase().includes('warm')
  )
    timingMultiplier = 0.5;
  if (
    lead.temperature === 'Cold' ||
    lead.import_tag?.toLowerCase().includes('cold')
  )
    timingMultiplier = 1.5;
};

export const mockApi = {
  login: async (u, p) =>
    new Promise((res) => {
      const usr = usersTable.find((x) => x.user_id === u);
      res({ token: `jwt-${usr?.id}`, user: usr });
    }),
  getUsers: async () => new Promise((res) => res([...usersTable])),
  getLeads: async () =>
    new Promise((res) =>
      res(
        leadsTable
          .filter((l) => l.status !== 'deleted')
          .map((l) => ({ ...l, sla_status: calculateSLA(l, LEAD_TASKS) }))
      )
    ),

  createLead: async (data) =>
    new Promise((res) => {
      const score = calculateEdivyScore({
        last_activity_at: new Date().toISOString(),
        ...data,
      });
      const engine = score >= 70 ? 1 : 2;
      const vId =
        PIPELINE_VERSIONS.find((v) => v.status === 'active')?.id || 'v1';
      const sId = PIPELINE_STAGES.find((s) => s.version_id === vId)?.id;
      const nvId =
        NURTURE_VERSIONS.find((v) => v.status === 'active')?.id || 'nv1';
      const nsId = NURTURE_STAGES.find((s) => s.version_id === nvId)?.id;
      const newLead = {
        id: Date.now(),
        score,
        engine,
        stage_id: engine === 1 ? sId : null,
        nurture_stage_id: engine === 2 ? nsId : null,
        status: 'active',
        created_at: new Date().toISOString(),
        temperature: score >= 70 ? 'Warm' : 'Cold',
        is_nurture_paused: false,
        ...data,
      };
      leadsTable.push(newLead);
      if (engine === 1) instantiateTasksForStage(newLead.id, sId);
      else simulateNurtureScheduling(newLead, nvId);
      res(newLead);
    }),

  updateLead: async (id, data) =>
    new Promise((res, rej) =>
      setTimeout(() => {
        const idx = leadsTable.findIndex((l) => l.id === id);
        if (idx === -1) return rej(new Error('Not found'));
        leadsTable[idx] = { ...leadsTable[idx], ...data };
        res(leadsTable[idx]);
      }, 200)
    ),

  bulkAction: async (leadIds, action, value) =>
    new Promise((res) =>
      setTimeout(() => {
        const activeVersionId =
          PIPELINE_VERSIONS.find((v) => v.status === 'active')?.id || 'v1';
        const activeStages = PIPELINE_STAGES.filter(
          (s) => s.version_id === activeVersionId
        ).sort((a, b) => a.order - b.order);
        leadsTable = leadsTable.map((l) => {
          if (!leadIds.includes(l.id)) return l;
          if (action === 'assign') {
            if (value !== 'unassigned')
              notificationsTable.push({
                id: `n_${Date.now()}_${l.id}`,
                user_id: parseInt(value),
                type: 'assignment',
                message: `Assigned to ${l.school_name}`,
                is_read: false,
                created_at: new Date().toISOString(),
              });
            return {
              ...l,
              assigned_to: value === 'unassigned' ? null : parseInt(value),
              is_locked: l.engine === 1 && value !== 'unassigned',
              last_activity_at: new Date().toISOString(),
            };
          }
          if (action === 'delete') return { ...l, status: 'deleted' };
          if (action === 'move_engine') {
            const targetEngine = parseInt(value);
            const isReactivating = l.engine === 2 && targetEngine === 1;
            const targetStage =
              targetEngine === 1 ? activeStages[0] : NURTURE_STAGES[0];
            if (isReactivating) {
              LEAD_TASKS.push({
                id: `lt_${Date.now()}_${Math.random()}`,
                lead_id: l.id,
                template_id: 'reactivation',
                title: '🔥 REACTIVATION: Hot Lead Follow-Up',
                description:
                  'Lead engaged via Engine 2 Nurture. Call immediately.',
                type: 'call',
                is_mandatory: true,
                status: 'pending',
                due_date: new Date().toISOString(),
                priority: 3,
              });
            }
            return {
              ...l,
              engine: targetEngine,
              stage_id: targetStage.id,
              stage_name: targetStage.name,
              nurture_stage_id:
                targetEngine === 2 ? NURTURE_STAGES[0].id : null,
              temperature: isReactivating ? 'Hot' : l.temperature,
              engagement_status: isReactivating
                ? 'Engaged'
                : l.engagement_status,
            };
          }
          return l;
        });
        res({ success: true });
      }, 500)
    ),

  // ENGINE 1 VERSION CONTROL
  getPipelineVersions: async () =>
    new Promise((res) => res([...PIPELINE_VERSIONS])),
  duplicatePipelineVersion: async (sourceId, newName) =>
    new Promise((res) => {
      const newVid = `v_${Date.now()}`;
      PIPELINE_VERSIONS.push({
        id: newVid,
        name: newName,
        status: 'draft',
        created_at: new Date().toISOString(),
      });
      const sourceStages = PIPELINE_STAGES.filter(
        (s) => s.version_id === sourceId
      );
      sourceStages.forEach((s) => {
        const newSid = `s_${Date.now()}_${Math.random()}`;
        PIPELINE_STAGES.push({ ...s, id: newSid, version_id: newVid });
        const sourceTasks = TASK_TEMPLATES.filter((t) => t.stage_id === s.id);
        sourceTasks.forEach((t) => {
          TASK_TEMPLATES.push({
            ...t,
            id: `tt_${Date.now()}_${Math.random()}`,
            stage_id: newSid,
          });
        });
      });
      res(PIPELINE_VERSIONS);
    }),
  setActiveVersion: async (id) =>
    new Promise((res) => {
      PIPELINE_VERSIONS.forEach(
        (v) => (v.status = v.id === id ? 'active' : 'draft')
      );
      res(PIPELINE_VERSIONS);
    }),
  getPipelineStages: async (vId) =>
    new Promise((res) =>
      res(
        [...PIPELINE_STAGES]
          .filter((s) => s.version_id === vId)
          .sort((a, b) => a.order - b.order)
      )
    ),
  saveStage: async (data) =>
    new Promise((res) => {
      const ns = {
        id: `s_${Date.now()}`,
        engine: 1,
        order:
          PIPELINE_STAGES.filter((s) => s.version_id === data.version_id)
            .length + 1,
        ...data,
      };
      PIPELINE_STAGES.push(ns);
      res(ns);
    }),
  deleteStage: async (id) =>
    new Promise((res) => {
      PIPELINE_STAGES = PIPELINE_STAGES.filter((s) => s.id !== id);
      res(true);
    }),
  getTaskTemplates: async (sId) =>
    new Promise((res) =>
      res(
        TASK_TEMPLATES.filter((t) => t.stage_id === sId).sort(
          (a, b) => a.order - b.order
        )
      )
    ),
  saveTaskTemplate: async (data) =>
    new Promise((res) => {
      if (data.id) {
        TASK_TEMPLATES = TASK_TEMPLATES.map((t) =>
          t.id === data.id ? { ...t, ...data } : t
        );
        res(true);
      } else {
        TASK_TEMPLATES.push({ id: `tt_${Date.now()}`, ...data });
        res(true);
      }
    }),
  deleteTaskTemplate: async (id) =>
    new Promise((res) => {
      TASK_TEMPLATES = TASK_TEMPLATES.filter((t) => t.id !== id);
      res(true);
    }),
  reorderStages: async (ids) =>
    new Promise((res) => {
      PIPELINE_STAGES.forEach((s) => (s.order = ids.indexOf(s.id)));
      PIPELINE_STAGES.sort((a, b) => a.order - b.order);
      res(true);
    }),
  reorderTasks: async (ids) =>
    new Promise((res) => {
      TASK_TEMPLATES.forEach((t) => (t.order = ids.indexOf(t.id)));
      TASK_TEMPLATES.sort((a, b) => a.order - b.order);
      res(true);
    }),

  // ENGINE 2 VERSION CONTROL
  getNurtureVersions: async () =>
    new Promise((res) => res([...NURTURE_VERSIONS])),
  duplicateNurtureVersion: async (sourceId, newName) =>
    new Promise((res) => {
      const newVid = `nv_${Date.now()}`;
      NURTURE_VERSIONS.push({
        id: newVid,
        name: newName,
        status: 'draft',
        created_at: new Date().toISOString(),
      });
      const sourceStages = NURTURE_STAGES.filter(
        (s) => s.version_id === sourceId
      );
      sourceStages.forEach((s) => {
        const newSid = `ns_${Date.now()}_${Math.random()}`;
        NURTURE_STAGES.push({ ...s, id: newSid, version_id: newVid });
        const sourceActions = NURTURE_ACTIONS.filter(
          (a) => a.stage_id === s.id
        );
        sourceActions.forEach((a) => {
          NURTURE_ACTIONS.push({
            ...a,
            id: `na_${Date.now()}_${Math.random()}`,
            stage_id: newSid,
          });
        });
      });
      res(NURTURE_VERSIONS);
    }),
  setActiveNurtureVersion: async (id) =>
    new Promise((res) => {
      NURTURE_VERSIONS.forEach(
        (v) => (v.status = v.id === id ? 'active' : 'draft')
      );
      res(NURTURE_VERSIONS);
    }),
  getNurtureStages: async (vId) =>
    new Promise((res) =>
      res(
        [...NURTURE_STAGES]
          .filter((s) => s.version_id === vId)
          .sort((a, b) => a.order - b.order)
      )
    ),
  saveNurtureStage: async (data) =>
    new Promise((res) => {
      const ns = {
        id: `ns_${Date.now()}`,
        is_core: false,
        order:
          NURTURE_STAGES.filter((s) => s.version_id === data.version_id)
            .length + 1,
        ...data,
      };
      NURTURE_STAGES.push(ns);
      res(ns);
    }),
  updateNurtureStage: async (id, name) =>
    new Promise((res) => {
      NURTURE_STAGES = NURTURE_STAGES.map((s) =>
        s.id === id ? { ...s, name } : s
      );
      res(true);
    }),
  reorderNurtureStages: async (ids) =>
    new Promise((res) => {
      NURTURE_STAGES.forEach((s) => (s.order = ids.indexOf(s.id)));
      NURTURE_STAGES.sort((a, b) => a.order - b.order);
      res(true);
    }),
  deleteNurtureStage: async (id) =>
    new Promise((res) => {
      NURTURE_STAGES = NURTURE_STAGES.filter((s) => s.id !== id);
      res(true);
    }),
  getNurtureActions: async (sId) =>
    new Promise((res) =>
      res(
        NURTURE_ACTIONS.filter((a) => a.stage_id === sId).sort(
          (a, b) => a.offset_days - b.offset_days
        )
      )
    ),
  saveNurtureAction: async (data) =>
    new Promise((res) => {
      if (data.id) {
        NURTURE_ACTIONS = NURTURE_ACTIONS.map((a) =>
          a.id === data.id ? { ...a, ...data } : a
        );
        res(true);
      } else {
        NURTURE_ACTIONS.push({ id: `na_${Date.now()}`, ...data });
        res(true);
      }
    }),
  deleteNurtureAction: async (id) =>
    new Promise((res) => {
      NURTURE_ACTIONS = NURTURE_ACTIONS.filter((a) => a.id !== id);
      res(true);
    }),

  // NURTURE SETTINGS API
  getNurtureSettings: async () =>
    new Promise((res) => res({ ...NURTURE_SETTINGS })),
  saveNurtureSettings: async (data) =>
    new Promise((res) => {
      NURTURE_SETTINGS = { ...NURTURE_SETTINGS, ...data };
      res(true);
    }),

  // --- SCRIPT SYSTEM API & SELECTION ENGINE ---
  getScripts: async () =>
    new Promise((res) => setTimeout(() => res([...MOCK_SCRIPTS]), 200)),

  saveScript: async (data) =>
    new Promise((res) =>
      setTimeout(() => {
        if (data.id) {
          MOCK_SCRIPTS = MOCK_SCRIPTS.map((s) =>
            s.id === data.id ? { ...s, ...data } : s
          );
        } else {
          MOCK_SCRIPTS.push({
            id: `scr_${Date.now()}`,
            usage_count: 0,
            positive_outcomes: 0,
            ...data,
          });
        }
        res(true);
      }, 300)
    ),

  deleteScript: async (id) =>
    new Promise((res) =>
      setTimeout(() => {
        MOCK_SCRIPTS = MOCK_SCRIPTS.filter((s) => s.id !== id);
        res(true);
      }, 300)
    ),

  importScripts: async (scriptsArray) =>
    new Promise((res) =>
      setTimeout(() => {
        let imported = 0;
        scriptsArray.forEach((script) => {
          if (script.content && script.stage_id && script.message_type) {
            MOCK_SCRIPTS.push({
              id: `scr_imp_${Date.now()}_${Math.random()}`,
              engine: script.engine || 1,
              stage_id: script.stage_id,
              message_type: script.message_type,
              pc1: script.pc1 || 'Any',
              pc2: script.pc2 || 'Any',
              pc3: script.pc3 || 'Any',
              tone: script.tone || 'Professional',
              priority: script.priority || 2,
              content: script.content,
              usage_count: 0,
              positive_outcomes: 0,
            });
            imported++;
          }
        });
        res({ success: true, count: imported });
      }, 500)
    ),

  getRecommendedScripts: async (engine, stageId, messageType, leadId) =>
    new Promise((res) =>
      setTimeout(() => {
        const lead = leadsTable.find((l) => l.id === leadId);
        if (!lead) return res([]);

        let pool = MOCK_SCRIPTS.filter(
          (s) =>
            s.engine === engine &&
            (s.stage_id === stageId || s.stage_id === 'Any') &&
            (s.message_type === messageType || s.message_type === 'Any')
        );

        let scoredScripts = pool.map((script) => {
          let score = 0;
          if (script.pc1 === lead.pc1) score += 10;
          else if (script.pc1 === 'Any') score += 2;
          else score -= 5;
          if (script.pc2 === lead.pc2) score += 10;
          else if (script.pc2 === 'Any') score += 2;
          else score -= 5;
          if (script.pc3 === lead.pc3) score += 10;
          else if (script.pc3 === 'Any') score += 2;
          else score -= 5;
          return { ...script, matchScore: score };
        });

        let recommendations = scoredScripts
          .filter((s) => s.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 3);
        res(recommendations);
      }, 200)
    ),

  // AGENT DASHBOARD STUBS
  getAgentWorkspaceData: async (agentId) =>
    new Promise((res) => {
      const myLeads = leadsTable
        .filter(
          (l) =>
            l.assigned_to === agentId && l.engine === 1 && l.status === 'active'
        )
        .map((l) => ({ ...l, sla_status: calculateSLA(l, LEAD_TASKS) }));
      const myLeadIds = myLeads.map((l) => l.id);
      const myTasks = LEAD_TASKS.filter((t) => myLeadIds.includes(t.lead_id));
      res({ leads: myLeads, tasks: myTasks });
    }),
  completeTaskWithOutcome: async (taskId, outcome) =>
    new Promise((res) => {
      LEAD_TASKS = LEAD_TASKS.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'completed',
              outcome: outcome,
              completed_at: new Date().toISOString(),
            }
          : t
      );
      const task = LEAD_TASKS.find((t) => t.id === taskId);
      let lead = leadsTable.find((l) => l.id === task.lead_id);
      if (lead) {
        lead.last_activity_at = new Date().toISOString();
        if (
          ['Reply Received', 'Interested', 'Meeting Booked'].includes(outcome)
        ) {
          lead.engagement_status = 'Engaged';
          lead.temperature = outcome === 'Reply Received' ? 'Warm' : 'Hot';
          lead.score += 15;
        }
        leadsTable = leadsTable.map((l) =>
          l.id === lead.id ? { ...lead } : l
        );
      }
      res({ success: true });
    }),

  // STANDARD STUBS
  getCommandCenterData: async () =>
    new Promise((res) =>
      res({
        alerts: {},
        engine1: { total: 0, stages: [] },
        engine2: { total: 0, stages: [] },
        agents: [],
        campaigns: [],
        insights: [],
        diagnostics: { conversions: {}, speed: {} },
      })
    ),
  updateUser: async () => new Promise((res) => res(true)),
  deleteUser: async () => new Promise((res) => res(true)),
  createUser: async () => new Promise((res) => res(true)),
  deleteLead: async () => new Promise((res) => res(true)),
  getNotifications: async () => new Promise((res) => res([])),
  markNotificationsRead: async () => new Promise((res) => res(true)),
};
