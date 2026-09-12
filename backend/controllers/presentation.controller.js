const { Presentation, User, AuditLog } = require('../models');

exports.getAllPresentations = async (req, res, next) => {
  try {
    const presentations = await Presentation.findAll({
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'email'] }],
      order: [['created_at', 'DESC']]
    });
    return res.json({ presentations });
  } catch (err) {
    next(err);
  }
};

exports.getPresentationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const presentation = await Presentation.findByPk(id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'email'] }]
    });
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found' });
    }
    return res.json({ presentation });
  } catch (err) {
    next(err);
  }
};

exports.createPresentation = async (req, res, next) => {
  try {
    const { title, repo_target, description, slides_data } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const presentation = await Presentation.create({
      title,
      repo_target,
      description,
      slides_data: slides_data || [],
      created_by_user_id: req.user?.id || null
    });

    AuditLog.create({
      action: 'CREATE_PRESENTATION',
      target_resource: `Presentation:${presentation.id}`,
      user_id: req.user?.id || null,
      details: { title, repo_target }
    }).catch(() => {});

    return res.status(201).json({ presentation });
  } catch (err) {
    next(err);
  }
};

exports.updatePresentation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const presentation = await Presentation.findByPk(id);
    if (!presentation) return res.status(404).json({ error: 'Presentation not found' });

    // Check permissions
    if (presentation.created_by_user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own presentations' });
    }

    const { title, repo_target, description, slides_data } = req.body;
    await presentation.update({
      title: title !== undefined ? title : presentation.title,
      repo_target: repo_target !== undefined ? repo_target : presentation.repo_target,
      description: description !== undefined ? description : presentation.description,
      slides_data: slides_data !== undefined ? slides_data : presentation.slides_data
    });

    return res.json({ presentation });
  } catch (err) {
    next(err);
  }
};

exports.deletePresentation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const presentation = await Presentation.findByPk(id);
    if (!presentation) return res.status(404).json({ error: 'Presentation not found' });

    if (presentation.created_by_user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own presentations' });
    }

    await presentation.destroy();
    return res.json({ message: 'Presentation deleted successfully' });
  } catch (err) {
    next(err);
  }
};
