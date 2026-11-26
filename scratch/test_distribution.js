
const crypto = { randomUUID: () => Math.random().toString() };

function localTimetable(syllabus) {
  const dailyHours = syllabus.dailyStudyHours || 3;
  const days = [];
  let currentDay = 1;
  let currentDayHours = 0;
  let currentTasks = [];

  syllabus.modules.forEach((m) => {
    m.topics.forEach((t) => {
      let remainingHours = t.estimatedHours || 1;
      let isFirstPart = true;
      
      while (remainingHours > 0) {
        const availableToday = dailyHours - currentDayHours;
        
        if (availableToday <= 0) {
          days.push({ dayNumber: currentDay++, tasks: currentTasks });
          currentTasks = [];
          currentDayHours = 0;
          continue;
        }

        const durationToTake = Math.min(remainingHours, availableToday);
        
        currentTasks.push({
          moduleTitle: m.title,
          topicTitle: isFirstPart ? t.title : `${t.title} (Continued)`,
          duration: durationToTake,
          goal: t.description,
          importance: t.importance
        });

        currentDayHours += durationToTake;
        remainingHours -= durationToTake;
        isFirstPart = false;

        if (currentDayHours >= dailyHours) {
          days.push({ dayNumber: currentDay++, tasks: currentTasks });
          currentTasks = [];
          currentDayHours = 0;
        }
      }
    });
  });
  
  if (currentTasks.length > 0) {
    days.push({ dayNumber: currentDay++, tasks: currentTasks });
  }

  const finalizedDays = days.slice(0, 60);

  return { days: finalizedDays };
}

const mockSyllabus = {
  dailyStudyHours: 2,
  modules: [{
    title: "Module 1",
    topics: [
      { title: "Linux Utilities", estimatedHours: 10, description: "desc", importance: "High" },
      { title: "Sed and Awk", estimatedHours: 3, description: "desc", importance: "Medium" }
    ]
  }]
};

const result = localTimetable(mockSyllabus);
console.log(JSON.stringify(result, null, 2));
