-- Pictures for the starter exercises: a start and an end photo each, from
-- the public-domain Free Exercise DB (github.com/yuhonas/free-exercise-db,
-- the Unlicense), resized and kept in public/exercise-pictures as
-- <picture>-0.webp and <picture>-1.webp. Exercises without a good match have
-- none and link to a video search instead.
alter table fitness_exercises add column picture text check (picture ~ '^[A-Za-z0-9_-]{1,80}$');

update fitness_exercises e
set picture = p.picture
from (values
  ('Squat', 'Bodyweight_Squat'),
  ('Reverse lunge', 'Dumbbell_Rear_Lunge'),
  ('Glute bridge', 'Butt_Lift_Bridge'),
  ('Step-up', 'Dumbbell_Step_Ups'),
  ('Calf raise', 'Standing_Dumbbell_Calf_Raise'),
  ('Push-up', 'Pushups'),
  ('Incline push-up', 'Incline_Push-Up'),
  ('Chair dip', 'Bench_Dips'),
  ('Superman', 'Superman'),
  ('Plank', 'Plank'),
  ('Side plank', 'Side_Bridge'),
  ('Dead bug', 'Dead_Bug'),
  ('Goblet squat', 'Goblet_Squat'),
  ('Romanian deadlift', 'Stiff-Legged_Dumbbell_Deadlift'),
  ('Dumbbell reverse lunge', 'Dumbbell_Rear_Lunge'),
  ('Dumbbell hip thrust', 'Barbell_Hip_Thrust'),
  ('Dumbbell row', 'One-Arm_Dumbbell_Row'),
  ('Dumbbell floor press', 'Dumbbell_Floor_Press'),
  ('Shoulder press', 'Dumbbell_Shoulder_Press'),
  ('Lateral raise', 'Side_Lateral_Raise'),
  ('Biceps curl', 'Dumbbell_Bicep_Curl'),
  ('Overhead triceps extension', 'Standing_Dumbbell_Triceps_Extension'),
  ('Russian twist', 'Russian_Twist'),
  ('Dumbbell thruster', 'Kettlebell_Thruster'),
  ('Kettlebell swing', 'One-Arm_Kettlebell_Swings'),
  ('Band pull-apart', 'Band_Pull_Apart'),
  ('Banded side walk', 'Monster_Walk'),
  ('Band face pull', 'Face_Pull'),
  ('Barbell back squat', 'Barbell_Squat'),
  ('Deadlift', 'Barbell_Deadlift'),
  ('Bench press', 'Barbell_Bench_Press_-_Medium_Grip'),
  ('Lat pulldown', 'Wide-Grip_Lat_Pulldown'),
  ('Seated cable row', 'Seated_Cable_Rows'),
  ('Leg press', 'Leg_Press'),
  ('Leg curl', 'Lying_Leg_Curls'),
  ('Barbell hip thrust', 'Barbell_Hip_Thrust'),
  ('Cable triceps pushdown', 'Triceps_Pushdown'),
  ('Assisted pull-up', 'Band_Assisted_Pull-Up'),
  ('Cable chest fly', 'Cable_Crossover'),
  ('Easy run', 'Trail_Running_Walking'),
  ('Exercise bike', 'Bicycling_Stationary'),
  ('Rowing machine', 'Rowing_Stationary'),
  ('Cross-trainer', 'Elliptical_Trainer'),
  ('Mountain climbers', 'Mountain_Climbers'),
  ('Squat jumps', 'Freehand_Jump_Squat'),
  ('Kettlebell swing intervals', 'One-Arm_Kettlebell_Swings'),
  ('Cat-cow', 'Cat_Stretch'),
  ('Child''s pose', 'Childs_Pose'),
  ('Hip flexor stretch', 'Kneeling_Hip_Flexor'),
  ('Hamstring stretch', 'Hamstring_Stretch'),
  ('World''s greatest stretch', 'Worlds_Greatest_Stretch'),
  ('Figure-four stretch', 'Ankle_On_The_Knee'),
  ('Neck and shoulder rolls', 'Shoulder_Circles')
) as p (name, picture)
where lower(e.name) = lower(p.name);

-- The cue now matches its picture.
update fitness_exercises
set how = 'On your back, lift one straight leg and pull it gently towards you. A band or towel around the foot helps.'
where name = 'Hamstring stretch';
