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

// Serve MIDI files (direct access if needed)
app.use("/midis", express.static(midiDir));

// Force download endpoint
app.get("/download/:file", (req, res) => {
  const filePath = path.join(midiDir, req.params.file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  res.download(filePath);
});

// Generate MIDI
app.post("/generate-midi", (req, res) => {
  try {
    const { bpm = 120, files } = req.body;

    if (!files || typeof files !== "object") {
      return res.status(400).json({ error: "Invalid files object" });
    }

    const uniqueId = Date.now();
    let output = {};

    for (let name in files) {
      if (!Array.isArray(files[name]) || files[name].length === 0) {
        continue;
      }

      let track = new MidiWriter.Track();
      track.setTempo(bpm);

      files[name].forEach(n => {
        if (
          !n.note ||
          n.start == null ||
          n.duration == null ||
          n.velocity == null
        ) {
          return;
        }

        track.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [n.note],
            duration: "T" + Math.floor(n.duration * 128),
            startTick: Math.floor(n.start * 128),
            velocity: n.velocity
          })
        );
      });

      const writer = new MidiWriter.Writer(track);

      // Unique filename (prevents overwrite)
      const fileName = `${uniqueId}-${name}.mid`;
      const filePath = path.join(midiDir, fileName);

      fs.writeFileSync(filePath, writer.buildFile());

      // Return download link
      output[name] = `${BASE_URL}/download/${fileName}`;
    }

    if (Object.keys(output).length === 0) {
      return res.status(400).json({ error: "No valid MIDI data generated" });
    }

    res.json(output);
  } catch (err) {
    console.error("MIDI ERROR:", err);
    res.status(500).json({ error: "MIDI generation failed" });
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("MIDI Backend Running");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});