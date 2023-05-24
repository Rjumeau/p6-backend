const Sauce = require('../models/sauce')
const fs = require('fs');

exports.getAllSauces = (req, res, next) => {
  Sauce.find().then(
    (sauces) => {
      res.status(200).json(sauces);
    }
  ).catch(
    (error) => {
      res.status(400).json({
        error: error
      });
    }
  );
}

exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({
    _id: req.params.id
  }).then(
    (sauce) => {
      res.status(200).json(sauce);
    }
  ).catch(
    (error) => {
      res.status(404).json({
        error: error
      });
    }
  );
};


exports.createSauce = (req, res, next) => {
  const sauceObject = JSON.parse(req.body.sauce);
  delete sauceObject._id;
  delete sauceObject._userId;
  const sauce = new Sauce({
    ...sauceObject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  });
  sauce.save().then(
    () => {
      res.status(201).json({
        message: 'Sauce saved successfully!'
      });
    }
  ).catch(
    (error) => {
      res.status(400).json({
        error: error
      });
    }
  );
};

exports.modifySauce = (req, res, next) => {
  const sauceObject = req.file ? {
    ...JSON.parse(req.body.sauce),
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body };

  delete sauceObject._userId;
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: 'Not authorized' });
      } else {
        Sauce.updateOne({ _id: req.params.id }, { ...sauceObject, _id: req.params.id })
          .then(() =>
            res.status(200).json({ message: 'Sauce successfully modified!' }
          ))

          .catch(error => res.status(401).json({ error }));
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => {
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: 'Not authorized' });
      } else {
        const filename = sauce.imageUrl.split('/images/')[1];
        fs.unlink(`images/${filename}`, () => {
          Sauce.deleteOne({ _id: req.params.id })
            .then(() => { res.status(200).json({ message: 'Sauce deleted !' }) })
            .catch(error => res.status(401).json({ error }));
        });
      }
    })
    .catch(error => {
      res.status(500).json({ error });
    });
}

exports.addLike = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => {
      if (!sauce) {
        return res.status(404).json({ message: 'Sauce not found' });
      }

      const userId = req.auth.userId;
      const like = req.body.like;
      const usersLiked = sauce.usersLiked;
      const usersDisliked = sauce.usersDisliked;

      // User already liked the sauce
      if (like === 1 && usersLiked.includes(userId)) {
        return res.status(400).json({ message: 'User already liked the sauce' });
      }

      // User already disliked the sauce
      if (like === -1 && usersDisliked.includes(userId)) {
        return res.status(400).json({ message: 'User already disliked the sauce' });
      }

      // User like logic
      if (like === 1) {
        usersLiked.push(userId);
        Sauce.updateOne({ _id: req.params.id }, { $inc: { likes: 1 }, usersLiked: usersLiked })
          .then(() => { res.status(200).json({ message: 'Like added' }) })
          .catch(error => res.status(500).json({ error }));
      } else if (like === -1) {
        usersDisliked.push(userId);
        Sauce.updateOne({ _id: req.params.id }, { $inc: { dislikes: 1 }, usersDisliked: usersDisliked })
          .then(() => { res.status(200).json({ message: 'Dislike added' }) })
          .catch(error => res.status(500).json({ error }));
      } else {
        // like === 0, remove the like/dislike of the user
        const indexLiked = usersLiked.indexOf(userId);
        // check if user id is present and delete it
        if (indexLiked > -1) {
          usersLiked.splice(indexLiked, 1);
        }
        const indexDisliked = usersDisliked.indexOf(userId);
        if (indexDisliked > -1) {
          usersDisliked.splice(indexDisliked, 1);
        }
        Sauce.updateOne({ _id: req.params.id }, { usersLiked: usersLiked, usersDisliked: usersDisliked })
          .then(() => { res.status(200).json({ message: 'Like/Dislike removed' }) })
          .catch(error => res.status(500).json({ error }));
      }
    })
    .catch(error => {
      res.status(500).json({ error });
    });
}
