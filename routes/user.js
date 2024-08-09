const express = require("express");
const mongoose = require("mongoose");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

const router = express.Router();

const User = require("../models/User");

router.post("/user/signup", async (req, res) => {
  try {
    if (await User.findOne({ email: req.body.email })) {
      return res.status(400).json({ error: "This email already exists" });
    }
    if (!req.body.username) {
      return res.status(400).json({ error: "Please enter a username" });
    }
    if (await User.findOne({ "account.username": req.body.username })) {
      return res.status(400).json({ error: "This username is already taken" });
    }
    const newSalt = uid2(64);
    const newUser = new User({
      email: req.body.email,
      account: {
        username: req.body.username,
        avatar: Object, // nous verrons plus tard comment uploader une image
      },
      newsletter: req.body.newsletter,
      token: uid2(64),
      hash: SHA256(req.body.password + newSalt).toString(encBase64),
      salt: newSalt,
    });
    await newUser.save();
    return res.status(201).json({
      _id: newUser._id,
      token: newUser.token,
      account: newUser.account,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user === null) {
      return res.status(400).json({ error: "Wrong email" });
    }
    if (user.email === req.body.email) {
      const currentHash = SHA256(req.body.password + user.salt).toString(
        encBase64
      );
      if (currentHash === user.hash) {
        return res.status(200).json({
          _id: user._id,
          token: user.token,
          account: user.account,
        });
      }
      return res.status(400).json({ error: "Wrong password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
