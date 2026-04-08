const express = require("express");
const fs = require("fs");
const path = require("path");
const MidiWriter = require("midi-writer-js");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Ensure midis folder exists
const midiDir = path.join(__dirname, "midis");
if (!fs.existsSync(midiDir)) {
  fs.mkdirSync(midiDir);
}

// Serve MIDI files (direct access)
app.use("/midis", express.static(midiDir));

// Force download endpoint
app.get("/download/:file", (req, res) => {
  const filePath = path.join(midiDir, req.params.file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  res.download(filePath);
});

// Humanize timing
function humanize(value, amount) {
  return value + (Math.random() * amount - amount / 2);
}

// Generate MIDI
app.post("/generate-midi", (req, res) => {
  try {
    const { bpm = 120, files, swing = 0.1, velocityVar = 10 } = req.body;

    if (!files) {
      return res.status(400).json({ error: "Missing files data" });
    }

    const uniqueId = Date.now();
    let output = {};

    for (let name in files) {
      let track = new MidiWriter.Track();
      track.setTempo(bpm);

      files[name].forEach(n => {
        let start = humanize(n.start, swing);

        let velocity = Math.max(
          30,
          Math.min(
            127,
            n.velocity + Math.floor(Math.random() * velocityVar - velocityVar / 2)
          )
        );

        track.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [n.note],
            duration: "T" + Math.floor(n.duration * 128),
            startTick: Math.floor(start * 128),
            velocity: velocity
          })
        );
      });

      let writer = new MidiWriter.Writer(track);

      // Unique filename (prevents overwrite)
      let fileName = `${uniqueId}-${name}.mid`;
      let filePath = path.join(midiDir, fileName);

      fs.writeFileSync(filePath, writer.buildFile());

      // Return download link (FORCES DOWNLOAD)
      output[name] = `${BASE_URL}/download/${fileName}`;
    }

    res.json(output);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "MIDI generation failed" });
  }
});

// Health check (Railway uses this)
app.get("/", (req, res) => {
  res.send("MIDI Backend Running");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});