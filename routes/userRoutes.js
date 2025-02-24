const express = require("express");
const router = express.Router();
const user = require("../controllers/userController");

router.post("/start", user.startUserJourney);
router.post("/:userId/select-frame", user.selectFrame);
router.post("/:userId/select-number", user.createNoOfCopies);

module.exports = router;
