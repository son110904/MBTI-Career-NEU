const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());


const uri = "mongodb+srv://sonph2013_db_user:Son110904@cluster1.detor9o.mongodb.net/?appName=Cluster1";

mongoose
  .connect(uri)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB error:", err));

const mbtiResultSchema = new mongoose.Schema(
  {
    mbtiType: String,
    scores: Object,
    answers: Object,
    meta: Object,
  },
  { timestamps: true }
);

const MbtiResult = mongoose.model("MbtiResult", mbtiResultSchema);

app.post("/api/mbti-result", async (req, res) => {
  try {
    const doc = await MbtiResult.create(req.body);
    res.status(201).json({ ok: true, id: doc._id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "SAVE_FAILED" });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});