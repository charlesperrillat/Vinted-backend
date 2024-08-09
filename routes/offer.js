const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");

const fileUpload = require("express-fileupload");

const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const User = require("../models/User");
const Offer = require("../models/Offer");

const isAuthenticated = require("../middlewares/isAuthenticated");

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const pictureToUpload = req.files.picture;
      const newOffer = new Offer({
        product_name: req.body.title,
        product_description: req.body.description,
        product_price: parseInt(req.body.price),
        product_details: [
          { MARQUE: req.body.brand },
          { TAILLE: req.body.size },
          { ÉTAT: req.body.condition },
          { COULEUR: req.body.color },
          { EMPLACEMENT: req.body.city },
        ],
        owner: req.user,
      });
      const pictureObject = await cloudinary.uploader.upload(
        convertToBase64(pictureToUpload),
        { folder: `/vinted/offers/${newOffer._id}` }
      );
      newOffer.product_image = { secure_url: pictureObject.secure_url };
      await newOffer.save();
      return res.json(newOffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put(
  "/offer/modify/:id",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const offerToModify = await Offer.findById(req.params.id);
      if (offerToModify) {
        offerToModify.product_name = req.body.title;
        offerToModify.product_description = req.body.description;
        offerToModify.product_price = parseInt(req.body.price);
        offerToModify.product_details[0]["MARQUE"] = req.body.brand;
        offerToModify.product_details[1]["TAILLE"] = req.body.size;
        offerToModify.product_details[2]["ÉTAT"] = req.body.condition;
        offerToModify.product_details[3]["COULEUR"] = req.body.color;
        offerToModify.product_details[4]["EMPLACEMENT"] = req.body.city;
        const newPictureToUpload = req.files.picture;
        const newPictureObject = await cloudinary.uploader.upload(
          convertToBase64(newPictureToUpload),
          { folder: `/vinted/offers/${offerToModify._id}` }
        );
        offerToModify.product_image = {
          secure_url: newPictureObject.secure_url,
        };
        await offerToModify.save();
        return res.json(offerToModify);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get("/offers", async (req, res) => {
  try {
    const { title, priceMin, priceMax, sort, page } = req.query;

    const filters = {};
    const sorting = {};
    let productsPerPage = 2;
    let skipedProducts = 0;

    if (title) {
      filters.product_name = new RegExp(`${title}`, "i");
    }
    if (priceMin || priceMax) {
      filters.product_price = {};
      if (priceMin) {
        filters.product_price.$gte = priceMin;
      }
      if (priceMax) {
        filters.product_price.$lte = priceMax;
      }
    }

    if (sort) {
      sorting.product_price = sort.slice(6);
    }

    if (page && parseInt(page) > 1) {
      skipedProducts = productsPerPage * parseInt(page - 1);
    }

    const query = await Offer.find(filters)
      .sort(sorting)
      .skip(skipedProducts)
      .limit(productsPerPage)
      .populate("owner", "account");

    results = {
      count: query.length,
      offers: query,
    };

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/offers/:id", async (req, res) => {
  try {
    if (req.params.id) {
      const offer = await Offer.findById(req.params.id).populate(
        "owner",
        "account"
      );
      if (!offer) {
        return res.status(400).json({ message: "Offer not found" });
      }
      return res.status(200).json(offer);
    } else {
      res.status(400).json({ message: "Id is missing" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
