const express = require("express");
const MidiWriter = require("midi-writer-js");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/generate-midi", (req, res) => {
  const { bpm, files } = req.body;

  let output = {};

  for (let name in files) {
    let track = new MidiWriter.Track();
    track.setTempo(bpm);

    files[name].forEach(n => {
      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [n.note],
        duration: 'T' + Math.floor(n.duration * 128),
        startTick: Math.floor(n.start * 128),
        velocity: n.velocity
      }));
    });

    let writer = new MidiWriter.Writer(track);
    let fileName = `${name}.mid`;

    fs.writeFileSync(`./midis/${fileName}`, writer.buildFile());

    output[name] = `http://localhost:3000/midis/${fileName}`;
  }

  res.json(output);
});

app.use("/midis", express.static("midis"));

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});