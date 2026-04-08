function humanize(value, amount) {
  return value + (Math.random() * amount - amount / 2);
}

app.post("/generate-midi", (req, res) => {
  const { bpm, files, swing = 0.1, velocityVar = 10 } = req.body;
  let output = {};

  for (let name in files) {
    let track = new MidiWriter.Track();
    track.setTempo(bpm);

    files[name].forEach(n => {
      let start = humanize(n.start, swing);
      let velocity = Math.max(30, Math.min(127, n.velocity + Math.floor(Math.random() * velocityVar - velocityVar/2)));

      track.addEvent(new MidiWriter.NoteEvent({
        pitch: [n.note],
        duration: "T" + Math.floor(n.duration * 128),
        startTick: Math.floor(start * 128),
        velocity: velocity
      }));
    });

    let writer = new MidiWriter.Writer(track);
    let fileName = `${name}.mid`;

    fs.writeFileSync(`./midis/${fileName}`, writer.buildFile());

    output[name] = `${BASE_URL}/midis/${fileName}`;
  }

  res.json(output);
});