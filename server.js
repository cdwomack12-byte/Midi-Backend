const express = require("express");
const fs = require("fs");
const path = require("path");
const MidiWriter = require("midi-writer-js");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BASE_URL =
  process.env.BASE_URL || `http://localhost:${PORT}`;

// Ensure midis folder exists
const midiDir = path.join(__dirname, "midis");
if (!fs.existsSync(midiDir)) {
  fs.mkdirSync(midiDir);
}

// Serve MIDI files
app.use("/midis", express.static(midiDir));

// Download endpoint
app.get("/download/:file", (req, res) => {
  const filePath = path.join(midiDir, req.params.file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  res.download(filePath);
});

// Generate MIDI endpoint
app.post("/generate-midi", (req, res) => {
  try {
    const { bpm = 120, files } = req.body;

    if (!files || typeof files !== "object") {
      return res
        .status(400)
        .json({ success: false, error: "Invalid files object" });
    }

    const uniqueId = Date.now();
    let output = {};

    for (let name in files) {
      const notes = files[name];

      if (!Array.isArray(notes) || notes.length === 0) continue;

      let track = new MidiWriter.Track();
      track.setTempo(bpm);

      notes.forEach((n) => {
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

      const fileName = `${uniqueId}-${name}.mid`;
      const filePath = path.join(midiDir, fileName);

      fs.writeFileSync(filePath, writer.buildFile());

      output[name] = `${BASE_URL}/download/${fileName}`;
    }

    if (Object.keys(output).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid MIDI data generated"
      });
    }

    // ✅ FIXED RESPONSE STRUCTURE (CRITICAL)
    res.json({
      success: true,
      files: output
    });

  } catch (err) {
    console.error("MIDI ERROR:", err);
    res.status(500).json({
      success: false,
      error: "MIDI generation failed"
    });
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