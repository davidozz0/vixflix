#!/usr/bin/env node
import bcryptjs from "bcryptjs";
import readline from "readline";
import { db } from "./db/index.js";
import { profiles } from "./db/schema.js";
import { eq } from "drizzle-orm";

async function ask(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, a => { rl.close(); resolve(a); }));
}

async function main() {
  const [,, cmd] = process.argv;

  if (cmd === "add") {
    let name = process.argv[3];
    let pin = process.argv[4];
    if (!name) name = await ask("Nome utente: ");
    if (!pin) pin = await ask("PIN (4 cifre): ");
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      console.error("Il PIN deve essere di 4 cifre numeriche.");
      process.exit(1);
    }
    const existing = db.select().from(profiles).where(eq(profiles.name, name)).all();
    if (existing.length > 0) {
      console.error(`Utente "${name}" esiste già.`);
      process.exit(1);
    }
    const pinHash = await bcryptjs.hash(pin, 10);
    db.insert(profiles).values({ name, pinHash }).run();
    console.log(`✅ Utente "${name}" creato con successo.`);
  } else if (cmd === "list") {
    const rows = db.select({ id: profiles.id, name: profiles.name, createdAt: profiles.createdAt }).from(profiles).orderBy(profiles.id).all();
    console.log("ID | Nome       | Creato il");
    console.log("-----------------------------");
    for (const r of rows) {
      console.log(`${r.id}  | ${r.name.padEnd(10)} | ${r.createdAt}`);
    }
  } else if (cmd === "delete") {
    let name = process.argv[3];
    if (!name) name = await ask("Nome utente da eliminare: ");
    const result = db.delete(profiles).where(eq(profiles.name, name)).run();
    if (result.changes > 0) {
      console.log(`✅ Utente "${name}" eliminato.`);
    } else {
      console.error(`Utente "${name}" non trovato.`);
    }
  } else if (cmd === "changepin") {
    let name = process.argv[3];
    let pin = process.argv[4];
    if (!name) name = await ask("Nome utente: ");
    const existing = db.select().from(profiles).where(eq(profiles.name, name)).all();
    if (existing.length === 0) {
      console.error(`Utente "${name}" non trovato.`);
      process.exit(1);
    }
    if (!pin) pin = await ask("Nuovo PIN (4 cifre): ");
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      console.error("Il PIN deve essere di 4 cifre numeriche.");
      process.exit(1);
    }
    const pinHash = await bcryptjs.hash(pin, 10);
    db.update(profiles).set({ pinHash }).where(eq(profiles.name, name)).run();
    console.log(`✅ PIN di "${name}" aggiornato con successo.`);
  } else {
    console.log("VixFlix Admin CLI");
    console.log("  npx tsx src/admin.ts add [nome] [pin]         Crea un nuovo utente");
    console.log("  npx tsx src/admin.ts list                      Lista tutti gli utenti");
    console.log("  npx tsx src/admin.ts delete [nome]             Elimina un utente");
    console.log("  npx tsx src/admin.ts changepin [nome] [pin]    Cambia PIN di un utente");
  }
}

main();
