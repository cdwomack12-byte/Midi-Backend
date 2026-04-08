const express = require("express");
const MidiWriter = require("midi-writer-js");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// CREATE MIDI ENDPOINT
app.post("/generate-midi", (req, res) => {
  const { bpm, files } = req.body;
  let output = {};

  for (let name in files) {
    let track = new MidiWriter.Track();
    track.setTempo(bpm);

    files[name].forEach(n => {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [n.note],
        duration: "T" + Math.floor(n.duration * 128),
        startTick: Math.floor(n.start * 128),
        velocity: n.velocity
      }));
    });

    let writer = new MidiWriter.Writer(track);
    let fileName = `${name}.mid`;

    fs.writeFileSync(`./midis/${fileName}`, writer.buildFile());

    output[name] = `${BASE_URL}/midis/${fileName}`;
  }

  res.json(output);
});

// SERVE MIDI FILES
app.use("/midis", express.static("midis"));

// PORT + URL CONFIG
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// START SERVER
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});