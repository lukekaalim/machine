import { compile } from "./compiler.ts";
import { dump } from "./memory.ts";
import { link } from "./runtime.ts";
import { createSystem } from "./system.ts";

const start = () => {
  const source = `
    //const hello = "world";
    //const allocationSize = 16;
    //const exitCode = 0;
    //const a = alloc(allocationSize);
    "std://out";
    "whazzup";
    write("./myfile.txt", "Howdy partner!");
    write("std://out", "Howdy partner!");
  `;
  const compilation = compile(source);
  const executable = link(compilation);

  //console.log("EXECUTABLE")
  //dump(executable.memory)

  const system = createSystem();

  system.load(executable);
  system.run();

  system.dump();
};

start();
