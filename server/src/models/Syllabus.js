import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  id: String,
  title: String,
  description: String,
  estimatedHours: Number,
  status: { type: String, enum: ['todo', 'in-progress', 'completed'], default: 'todo' },
  importance: { type: String, enum: ['High', 'Medium', 'Low'] }
}, { _id: false });

const moduleSchema = new mongoose.Schema({
  id: String,
  title: String,
  topics: [topicSchema]
}, { _id: false });

const timetableTaskSchema = new mongoose.Schema({
  topicTitle: String,
  moduleTitle: String,
  duration: Number,
  goal: String,
  importance: { type: String, enum: ['High', 'Medium', 'Low'] }
}, { _id: false });

const timetableDaySchema = new mongoose.Schema({
  dayNumber: Number,
  tasks: [timetableTaskSchema]
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  days: [timetableDaySchema],
  summary: String,
  isFallback: Boolean,
  error: String
}, { _id: false });

const syllabusSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userEmail: { type: String, required: true, lowercase: true },
  title: String,
  description: String,
  role: { type: String, enum: ['Student', 'Correspondence', 'Govt Aspirant'] },
  modules: [moduleSchema],
  timetable: timetableSchema,
  examDate: String,
  dailyStudyHours: Number,
  isFallback: Boolean,
  error: String,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

syllabusSchema.index({ userEmail: 1, createdAt: -1 });

export default mongoose.model('Syllabus', syllabusSchema);
