import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
const bundle = await build({
  stdin: {
    contents: `
import {createMatch,step} from './src/combat/engine';
import {CPU} from './src/ai/cpu';
export function probe() {
 const ids=['jamie','nash','bucket','beardy'], results=[];
 for(let n=0;n<16;n++) {
  const a=ids[n%4], b=ids[(n+1+Math.floor(n/4))%4],m=createMatch(a,b);
  m.roundsToWin=1;
  const p=new CPU('normal',71+n),q=new CPU('normal',33+n);
  while(m.phase!=='matchOver'&&m.tick<20000) step(m,[p.input(m,0),q.input(m,1)]);
  results.push({a,b,seconds:Math.round((m.tick-245)/60),winner:m.winner,timeout:m.timer<=0});
 }
 return results;
}`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { probe } = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundle.outputFiles[0].text).toString("base64")
);
const results = probe();
mkdirSync("docs/review-master", { recursive: true });
writeFileSync(
  "docs/review-master/balance.json",
  JSON.stringify(
    {
      scope:
        "Seeded normal-v-normal CPU rounds including hitstop, excluding intro/result delay. Rule preset: one round to win. No health/timer/winner mutation. Not human balance acceptance.",
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(`${results.length} rounds measured`);
