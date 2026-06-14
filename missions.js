/* =============================================================
   THE GRIND — DATA LAYER
   14-day program as a daily training session. IDs are kept stable
   so existing saved progress still maps. Config only — no logic.
   ============================================================= */

/* tag → drives the colour-coded pill on each exercise */
const TAGS = {
  STRENGTH: "#FF4D00",
  CARDIO:   "#0066FF",
  CORE:     "#7C3AED",
  MOBILITY: "#12B76A"
};

const MISSIONS = [
  { id:"boot",    name:"WARM-UP",          sub:"Get loose",        tag:"MOBILITY",
    detail:"Spin the body up before the heavy work.",
    protocol:["Jumping jacks — 1 min","Arm circles — 30 sec","Light squats — 15","Hip & leg swings — 1 min"],
    sets:1, reps:"5 min", xp:60,  kcal:30 },

  { id:"chest",   name:"PUSH-UPS",         sub:"Board assault",    tag:"STRENGTH",
    detail:"Rotate the board colour slots — chest, shoulders, triceps.",
    protocol:["Push-ups on the board"],
    sets:3, reps:"12 reps", xp:150, kcal:55 },

  { id:"legs",    name:"SQUATS",           sub:"Leg burner",       tag:"STRENGTH",
    detail:"Chest up, knees over toes, full depth every rep.",
    protocol:["Bodyweight squats"],
    sets:3, reps:"20 reps", xp:130, kcal:60 },

  { id:"core",    name:"PLANK",            sub:"Hold tight",       tag:"CORE",
    detail:"Straight line head to heels. Brace hard, don't sag.",
    protocol:["Plank hold"],
    sets:3, reps:"40 sec", xp:120, kcal:35 },

  { id:"climb",   name:"MOUNTAIN CLIMBERS",sub:"Engine builder",   tag:"CARDIO",
    detail:"Fast knees to chest, hips low. This is cardio.",
    protocol:["Mountain climbers"],
    sets:3, reps:"30 sec", xp:130, kcal:55 },

  { id:"lunge",   name:"LUNGES",           sub:"Stride work",      tag:"STRENGTH",
    detail:"Long step, back knee toward the floor, drive up.",
    protocol:["Walking lunges — per leg"],
    sets:3, reps:"10 / leg", xp:130, kcal:50 },

  { id:"glute",   name:"GLUTE BRIDGES",    sub:"Posterior chain",  tag:"STRENGTH",
    detail:"Squeeze hard at the top, pause one second.",
    protocol:["Glute bridges"],
    sets:3, reps:"15 reps", xp:110, kcal:35 },

  { id:"knees",   name:"HIGH KNEES",       sub:"Sprint in place",  tag:"CARDIO",
    detail:"Drive knees up high, stay on the balls of your feet.",
    protocol:["High knees"],
    sets:3, reps:"30 sec", xp:110, kcal:45 },

  { id:"abs",     name:"CORE CIRCUIT",     sub:"Ab finisher",      tag:"CORE",
    detail:"One continuous round, minimal rest between moves.",
    protocol:["Plank — 45 sec","Leg raises — 15","Bicycle crunches — 20","Russian twists — 20"],
    sets:1, reps:"1 round", xp:160, kcal:50 },

  { id:"flex",    name:"STRETCH",          sub:"Cool down",        tag:"MOBILITY",
    detail:"Slow stretches: hamstrings, chest, shoulders, hips.",
    protocol:["Full-body stretch"],
    sets:1, reps:"5 min", xp:70,  kcal:20 },

  { id:"march",   name:"BRISK WALK",       sub:"Cardio base",      tag:"CARDIO",
    detail:"Fast enough that talking is slightly hard. 8k–10k steps.",
    protocol:["Brisk walk"],
    sets:1, reps:"30–40 min", xp:180, kcal:150 },

  { id:"inferno", name:"RUN INTERVALS",    sub:"Fat burner",       tag:"CARDIO",
    detail:"Run 2 min, walk 1 min. Repeat. The main fat burner.",
    protocol:["Jog / walk intervals"],
    sets:1, reps:"20 min", xp:220, kcal:200 }
];

const PROGRAM_DAYS   = 14;
const TOTAL_MISSIONS = MISSIONS.length;

/* ---- Rank ladder (level derived from total XP) ---- */
const RANKS = [
  { min:1,  title:"Rookie"  },
  { min:3,  title:"Grinder" },
  { min:5,  title:"Lifter"  },
  { min:8,  title:"Beast"   },
  { min:10, title:"Savage"  },
  { min:14, title:"Elite"   },
  { min:20, title:"Machine" },
  { min:35, title:"Legend"  },
  { min:50, title:"G.O.A.T." }
];
function rankForLevel(level){
  let r = RANKS[0].title;
  for (const rank of RANKS) if (level >= rank.min) r = rank.title;
  return r;
}

/* ---- Achievements (check reads the live stats object) ---- */
const ACHIEVEMENTS = [
  { id:"first",   icon:"🔥", title:"First Rep",      desc:"Complete your first exercise.",
    check:s=>s.totalMissions>=1 },
  { id:"perfect", icon:"💯", title:"Full Session",   desc:"Finish all 12 in one day.",
    check:s=>s.perfectDays>=1 },
  { id:"streak3", icon:"⚡", title:"On a Roll",       desc:"Hit a 3-day streak.",
    check:s=>s.longestStreak>=3 },
  { id:"streak7", icon:"🚀", title:"Locked In",       desc:"Hit a 7-day streak.",
    check:s=>s.longestStreak>=7 },
  { id:"push500", icon:"💪", title:"500 Push-ups",    desc:"Bank 500 total push-ups.",
    check:s=>s.pushupTotal>=500 },
  { id:"cardio",  icon:"🏃", title:"Cardio Killer",   desc:"Run intervals 7 times.",
    check:s=>(s.missionCounts.inferno||0)>=7 },
  { id:"fifty",   icon:"🏋️", title:"50 Down",         desc:"Complete 50 exercises total.",
    check:s=>s.totalMissions>=50 },
  { id:"warrior", icon:"⭐", title:"Level 5",          desc:"Reach Level 5.",
    check:s=>s.level>=5 },
  { id:"campaign",icon:"🏆", title:"2 Weeks Strong",  desc:"Train on 14 days.",
    check:s=>s.activeDays>=PROGRAM_DAYS }
];
