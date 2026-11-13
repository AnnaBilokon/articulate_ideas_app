-- Fitness workspace: an exercise library, and workouts made from it. A
-- workout is suggested for the time and equipment you have (or by Claude),
-- then ticked off exercise by exercise; a sport or class is logged as done.
create table fitness_exercises (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('strength', 'cardio', 'mobility')),
  -- Works with any of these; 'body' needs nothing.
  equipment text[] not null check (
    cardinality(equipment) > 0 and equipment <@ array['body', 'dumbbells', 'bands', 'kettlebell', 'gym']
  ),
  muscles text[] not null default '{}' check (
    muscles <@ array['legs', 'glutes', 'chest', 'back', 'shoulders', 'arms', 'core']
  ),
  -- Sets of reps, a hold (or interval) in seconds, or minutes of steady cardio.
  measure text not null check (measure in ('reps', 'hold', 'duration')),
  reps smallint check (reps between 1 and 100),
  seconds smallint check (seconds between 5 and 600),
  -- Done once on each side, so it takes twice as long.
  each_side boolean not null default false,
  -- A short cue on how to do it.
  how text check (char_length(how) <= 400),
  -- Hidden exercises aren't suggested; workouts that used them keep them.
  hidden_at timestamptz,
  check (measure <> 'reps' or reps is not null),
  check (measure <> 'hold' or seconds is not null)
);

create unique index fitness_exercises_name_idx on fitness_exercises (lower(name));

create table fitness_workouts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- The calendar day, in the app's time zone.
  day date not null,
  title text not null check (char_length(title) between 1 and 80),
  kind text not null check (kind in ('strength', 'cardio', 'mobility', 'sport')),
  -- Planned when started; what it really took once done.
  minutes smallint not null check (minutes between 1 and 600),
  -- What was at hand, so a swapped exercise uses it too.
  equipment text[] not null default '{}',
  -- Suggested by the rules, by Claude, or logged by hand after the fact.
  source text not null default 'rules' check (source in ('rules', 'ai', 'logged')),
  done_at timestamptz,
  feeling text check (feeling in ('easy', 'good', 'hard')),
  note text check (char_length(note) <= 1000)
);

create index fitness_workouts_day_idx on fitness_workouts (day desc);

create table fitness_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references fitness_workouts (id) on delete cascade,
  -- Kept by name too, so history survives an exercise being deleted.
  exercise_id uuid references fitness_exercises (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  position smallint not null default 0,
  sets smallint check (sets between 1 and 10),
  reps smallint check (reps between 1 and 100),
  seconds smallint check (seconds between 5 and 7200),
  each_side boolean not null default false,
  weight_kg numeric(5, 1) check (weight_kg >= 0 and weight_kg < 1000),
  done_at timestamptz
);

create index fitness_workout_exercises_workout_idx on fitness_workout_exercises (workout_id);
create index fitness_workout_exercises_exercise_idx on fitness_workout_exercises (exercise_id);

alter table fitness_exercises enable row level security;
alter table fitness_workouts enable row level security;
alter table fitness_workout_exercises enable row level security;

-- A starter library. Edit, hide or add to it in the app.
insert into fitness_exercises (name, kind, equipment, muscles, measure, reps, seconds, each_side, how) values
  -- Strength, bodyweight
  ('Squat', 'strength', '{body}', '{legs,glutes}', 'reps', 12, null, false, 'Feet shoulder-width, sit back as if onto a chair, chest up.'),
  ('Reverse lunge', 'strength', '{body}', '{legs,glutes}', 'reps', 10, null, true, 'Step back, lower the back knee towards the floor, push up through the front heel.'),
  ('Glute bridge', 'strength', '{body}', '{glutes}', 'reps', 12, null, false, 'Lie on your back, knees bent, lift the hips and squeeze at the top.'),
  ('Step-up', 'strength', '{body}', '{legs,glutes}', 'reps', 10, null, true, 'Onto a sturdy step or low chair, the whole foot on it.'),
  ('Wall sit', 'strength', '{body}', '{legs}', 'hold', null, 30, false, 'Back against a wall, thighs parallel to the floor.'),
  ('Calf raise', 'strength', '{body}', '{legs}', 'reps', 15, null, false, 'Rise onto your toes slowly, lower slowly.'),
  ('Push-up', 'strength', '{body}', '{chest,arms,shoulders}', 'reps', 8, null, false, 'Body in one line. On your knees is fine.'),
  ('Incline push-up', 'strength', '{body}', '{chest,arms}', 'reps', 10, null, false, 'Hands on a table or bench: easier than on the floor.'),
  ('Pike push-up', 'strength', '{body}', '{shoulders,arms}', 'reps', 6, null, false, 'Hips high like an upside-down V, lower your head towards the floor.'),
  ('Chair dip', 'strength', '{body}', '{arms}', 'reps', 8, null, false, 'Hands on the edge of a chair, bend the elbows straight back.'),
  ('Superman', 'strength', '{body}', '{back}', 'reps', 10, null, false, 'Lie face down, lift arms and legs a little, hold a second.'),
  ('Plank', 'strength', '{body}', '{core}', 'hold', null, 30, false, 'On your forearms, body straight, don''t let the hips sag.'),
  ('Side plank', 'strength', '{body}', '{core}', 'hold', null, 20, true, 'On one forearm, hips lifted. Knees down to make it easier.'),
  ('Dead bug', 'strength', '{body}', '{core}', 'reps', 10, null, false, 'On your back, lower the opposite arm and leg, lower back stays down.'),
  ('Bird dog', 'strength', '{body}', '{core,back}', 'reps', 10, null, false, 'On hands and knees, reach out the opposite arm and leg, hold a second.'),
  -- Strength, dumbbells and kettlebell
  ('Goblet squat', 'strength', '{dumbbells,kettlebell,gym}', '{legs,glutes}', 'reps', 10, null, false, 'Hold one weight at your chest, squat between your knees.'),
  ('Romanian deadlift', 'strength', '{dumbbells,kettlebell,gym}', '{legs,glutes,back}', 'reps', 10, null, false, 'Soft knees, push the hips back, weights close to the legs, flat back.'),
  ('Dumbbell reverse lunge', 'strength', '{dumbbells,gym}', '{legs,glutes}', 'reps', 8, null, true, 'A weight in each hand, step back and lower.'),
  ('Dumbbell hip thrust', 'strength', '{dumbbells,gym}', '{glutes}', 'reps', 12, null, false, 'Shoulders on a sofa or bench, weight on the hips, lift and squeeze.'),
  ('Dumbbell row', 'strength', '{dumbbells,kettlebell,gym}', '{back,arms}', 'reps', 10, null, true, 'One hand on a bench or chair, pull the weight to your hip.'),
  ('Dumbbell floor press', 'strength', '{dumbbells,gym}', '{chest,arms}', 'reps', 10, null, false, 'Lie on the floor, press both weights up, elbows touch down lightly.'),
  ('Shoulder press', 'strength', '{dumbbells,kettlebell,gym}', '{shoulders,arms}', 'reps', 10, null, false, 'Standing or seated, press overhead without arching your back.'),
  ('Lateral raise', 'strength', '{dumbbells,gym}', '{shoulders}', 'reps', 12, null, false, 'Light weights, lift out to the sides up to shoulder height.'),
  ('Biceps curl', 'strength', '{dumbbells,bands,gym}', '{arms}', 'reps', 12, null, false, 'Elbows by your sides, curl up, lower slowly.'),
  ('Overhead triceps extension', 'strength', '{dumbbells,gym}', '{arms}', 'reps', 12, null, false, 'One weight in both hands behind your head, straighten the arms.'),
  ('Russian twist', 'strength', '{dumbbells,kettlebell,body}', '{core}', 'reps', 16, null, false, 'Sit leaning back a little, turn side to side. A weight makes it harder.'),
  ('Dumbbell thruster', 'strength', '{dumbbells,gym}', '{legs,shoulders}', 'reps', 10, null, false, 'Squat with the weights at your shoulders, stand up and press overhead.'),
  ('Kettlebell swing', 'strength', '{kettlebell,gym}', '{glutes,legs,back}', 'reps', 15, null, false, 'A hip hinge, not a squat: snap the hips forward, arms just guide it.'),
  ('Halo', 'strength', '{kettlebell,dumbbells}', '{shoulders,core}', 'reps', 8, null, false, 'Circle a kettlebell or dumbbell around your head, both ways.'),
  -- Strength, bands
  ('Band pull-apart', 'strength', '{bands}', '{back,shoulders}', 'reps', 15, null, false, 'Arms straight at chest height, pull the band apart, squeeze the shoulder blades.'),
  ('Band row', 'strength', '{bands,gym}', '{back,arms}', 'reps', 12, null, false, 'Band around a door handle or your feet, pull to your ribs.'),
  ('Banded side walk', 'strength', '{bands}', '{glutes}', 'reps', 10, null, true, 'Band above the knees, half squat, step sideways.'),
  ('Band face pull', 'strength', '{bands,gym}', '{shoulders,back}', 'reps', 15, null, false, 'Pull the band towards your face, elbows high and wide.'),
  -- Strength, gym
  ('Barbell back squat', 'strength', '{gym}', '{legs,glutes}', 'reps', 8, null, false, 'Bar on the upper back, brace, squat to at least parallel.'),
  ('Deadlift', 'strength', '{gym}', '{legs,glutes,back}', 'reps', 6, null, false, 'Bar over mid-foot, flat back, push the floor away.'),
  ('Bench press', 'strength', '{gym}', '{chest,arms}', 'reps', 8, null, false, 'Feet down, shoulder blades back, lower to the chest with control.'),
  ('Lat pulldown', 'strength', '{gym}', '{back,arms}', 'reps', 10, null, false, 'Pull the bar to your upper chest, elbows down and back.'),
  ('Seated cable row', 'strength', '{gym}', '{back,arms}', 'reps', 10, null, false, 'Sit tall, pull to your belly, shoulders down.'),
  ('Leg press', 'strength', '{gym}', '{legs,glutes}', 'reps', 10, null, false, 'Feet hip-width on the plate, don''t lock the knees at the top.'),
  ('Leg curl', 'strength', '{gym}', '{legs}', 'reps', 12, null, false, 'Curl slowly, pause, lower slowly.'),
  ('Barbell hip thrust', 'strength', '{gym}', '{glutes}', 'reps', 10, null, false, 'Upper back on the bench, bar on the hips (with a pad), lift and squeeze.'),
  ('Cable triceps pushdown', 'strength', '{gym}', '{arms}', 'reps', 12, null, false, 'Elbows fixed by your sides, push down until straight.'),
  ('Assisted pull-up', 'strength', '{gym}', '{back,arms}', 'reps', 8, null, false, 'On the machine or with a band, chin over the bar.'),
  ('Cable chest fly', 'strength', '{gym}', '{chest}', 'reps', 12, null, false, 'Soft elbows, bring the hands together in front of the chest.'),
  -- Cardio, steady
  ('Brisk walk', 'cardio', '{body}', '{}', 'duration', null, null, false, 'Fast enough that talking takes a little effort.'),
  ('Easy run', 'cardio', '{body}', '{}', 'duration', null, null, false, 'A pace you could hold a conversation at. Walk breaks are fine.'),
  ('Exercise bike', 'cardio', '{gym}', '{}', 'duration', null, null, false, 'Steady pace, or 1 minute harder every 4.'),
  ('Rowing machine', 'cardio', '{gym}', '{}', 'duration', null, null, false, 'Legs, then body, then arms; reverse on the way back.'),
  ('Cross-trainer', 'cardio', '{gym}', '{}', 'duration', null, null, false, 'Steady pace, stand tall.'),
  -- Cardio, intervals
  ('Jumping jacks', 'cardio', '{body}', '{}', 'hold', null, 40, false, 'Step them out instead of jumping for a quieter version.'),
  ('High knees', 'cardio', '{body}', '{}', 'hold', null, 30, false, 'Run on the spot, knees up to hip height.'),
  ('Mountain climbers', 'cardio', '{body}', '{core}', 'hold', null, 30, false, 'From a high plank, drive the knees in turn towards the chest.'),
  ('Burpees', 'cardio', '{body}', '{}', 'hold', null, 30, false, 'Down to the floor, back up, a small jump. Step back instead of jumping to make it easier.'),
  ('Squat jumps', 'cardio', '{body}', '{legs}', 'hold', null, 30, false, 'Squat, jump, land softly. Plain squats on a quiet day.'),
  ('Skaters', 'cardio', '{body}', '{legs}', 'hold', null, 30, false, 'Leap side to side, landing on one foot.'),
  ('Butt kicks', 'cardio', '{body}', '{}', 'hold', null, 30, false, 'Jog on the spot, heels up towards your seat.'),
  ('Kettlebell swing intervals', 'cardio', '{kettlebell}', '{glutes}', 'hold', null, 30, false, 'Swings, as many good ones as you can in the time.'),
  -- Mobility and stretching
  ('Cat-cow', 'mobility', '{body}', '{back}', 'hold', null, 45, false, 'On hands and knees, round the back, then let it dip, slowly with your breath.'),
  ('Child''s pose', 'mobility', '{body}', '{back,shoulders}', 'hold', null, 45, false, 'Knees wide, sit back on your heels, arms long in front.'),
  ('Hip flexor stretch', 'mobility', '{body}', '{legs}', 'hold', null, 30, true, 'Half-kneeling, tuck the hips under and lean forward gently.'),
  ('Hamstring stretch', 'mobility', '{body}', '{legs}', 'hold', null, 30, true, 'One leg straight on a low step, hinge forward with a flat back.'),
  ('World''s greatest stretch', 'mobility', '{body}', '{legs,back}', 'hold', null, 30, true, 'Lunge, hand down inside the front foot, turn and reach the other arm up.'),
  ('Thread the needle', 'mobility', '{body}', '{back,shoulders}', 'hold', null, 30, true, 'On hands and knees, slide one arm under the other and rest on the shoulder.'),
  ('Figure-four stretch', 'mobility', '{body}', '{glutes}', 'hold', null, 45, true, 'On your back, ankle over the other knee, pull the legs in.'),
  ('Downward dog', 'mobility', '{body}', '{legs,shoulders}', 'hold', null, 45, false, 'Hips up and back, pedal the heels slowly.'),
  ('Doorway chest stretch', 'mobility', '{body}', '{chest,shoulders}', 'hold', null, 30, true, 'Forearm on the door frame, step through until you feel it in the chest.'),
  ('Neck and shoulder rolls', 'mobility', '{body}', '{shoulders}', 'hold', null, 45, false, 'Slow circles both ways, no forcing.'),
  ('Lying spinal twist', 'mobility', '{body}', '{back}', 'hold', null, 30, true, 'On your back, drop both knees to one side, look the other way.'),
  ('Deep squat hold', 'mobility', '{body}', '{legs}', 'hold', null, 45, false, 'Sit low between your heels, hold something if you need to.'),
  ('Quad stretch', 'mobility', '{body}', '{legs}', 'hold', null, 30, true, 'Standing, hold one foot behind you, knees together.'),
  ('Band shoulder pass-through', 'mobility', '{bands}', '{shoulders,chest}', 'hold', null, 45, false, 'Hands wide on the band, slowly take it over your head and back.');
