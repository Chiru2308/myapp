import express from 'express';
import Syllabus from '../models/Syllabus.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require auth
router.use(protect);

// GET /api/syllabi - get all syllabi for current user
router.get('/', async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      console.warn("⚠️ Syllabi GET: No user or email in request");
      return res.status(401).json({ message: 'User context missing' });
    }
    console.log(`📡 Fetching syllabi for: ${req.user.email}`);
    const syllabi = await Syllabus.find({ userEmail: req.user.email })
      .sort({ createdAt: -1 })
      .lean();
    res.json(syllabi);
  } catch (err) {
    console.error("❌ SYLLABI GET ERROR:", err);
    res.status(500).json({ message: err.message || 'Failed to fetch syllabi' });
  }
});

// POST /api/syllabi - save/upsert syllabus
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, userEmail: req.user.email };
    const existing = await Syllabus.findOne({ id: data.id });
    let syllabus;
    if (existing) {
      if (existing.userEmail !== req.user.email) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      syllabus = await Syllabus.findOneAndUpdate(
        { id: data.id },
        data,
        { new: true, runValidators: true }
      ).lean();
    } else {
      syllabus = await Syllabus.create(data);
      syllabus = syllabus.toObject();
    }
    res.json(syllabus);
  } catch (err) {
    console.error("❌ SYLLABUS SAVE ERROR:", err);
    console.error("Payload was:", JSON.stringify(req.body).slice(0, 1000));
    res.status(500).json({ 
      message: err.message || 'Failed to save syllabus',
      details: err.name === 'ValidationError' ? err.errors : undefined
    });
  }
});

// PATCH /api/syllabi/:id/topic-status - update topic status
router.patch('/:id/topic-status', async (req, res) => {
  try {
    const { moduleId, topicId, status } = req.body;
    if (!moduleId || !topicId || !status) {
      return res.status(400).json({ message: 'moduleId, topicId, and status required' });
    }
    const syllabus = await Syllabus.findOne({ id: req.params.id });
    if (!syllabus) {
      return res.status(404).json({ message: 'Syllabus not found' });
    }
    if (syllabus.userEmail !== req.user.email) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const mod = syllabus.modules.find(m => m.id === moduleId);
    if (!mod) {
      return res.status(404).json({ message: 'Module not found' });
    }
    const topic = mod.topics.find(t => t.id === topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }
    topic.status = status;
    syllabus.markModified('modules');
    await syllabus.save();
    res.json(syllabus.toObject());
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update topic' });
  }
});

// DELETE /api/syllabi/:id
router.delete('/:id', async (req, res) => {
  try {
    const syllabus = await Syllabus.findOne({ id: req.params.id });
    if (!syllabus) {
      return res.status(404).json({ message: 'Syllabus not found' });
    }
    if (syllabus.userEmail !== req.user.email) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await Syllabus.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete syllabus' });
  }
});

export default router;
