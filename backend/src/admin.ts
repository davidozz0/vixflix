#!/usr/bin/env node
import Database from "better-sqlite3";
import bcryptjs from "bcryptjs";
import readline from "readline";

const dbPath = process.env.DATABASE_URL || "./sqlite.db";
const sqlite = new Database(dbPath);

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
    const pinHash = await bcryptjs.hash(pin, 10);
    const existing = sqlite.prepare("SELECT * FROM profiles WHERE name = ?").all(name);
    if (existing.length > 0) {
      console.error(`Utente "${name}" esiste già.`);
      process.exit(1);
    }
    sqlite.prepare("INSERT INTO profiles (name, pin_hash) VALUES (?, ?)").run(name, pinHash);
    console.log(`✅ Utente "${name}" creato con successo.`);
  } else if (cmd === "list") {
    const rows = sqlite.prepare("SELECT id, name, created_at FROM profiles ORDER BY id").all() as any[];
    console.log("ID | Nome       | Creato il");
    console.log("-----------------------------");
    for (const r of rows) {
      console.log(`${r.id}  | ${r.name.padEnd(10)} | ${r.created_at}`);
    }
  } else if (cmd === "delete") {
    let name = process.argv[3];
    if (!name) name = await ask("Nome utente da eliminare: ");
    const result = sqlite.prepare("DELETE FROM profiles WHERE name = ?").run(name);
    if (result.changes > 0) {
      console.log(`✅ Utente "${name}" eliminato.`);
    } else {
      console.error(`Utente "${name}" non trovato.`);
    }
  } else {
    console.log("VixFlix Admin CLI");
    console.log("  npx tsx src/admin.ts add [nome]    Crea un nuovo utente");
    console.log("  npx tsx src/admin.ts list           Lista tutti gli utenti");
    console.log("  npx tsx src/admin.ts delete [nome]  Elimina un utente");
  }
  sqlite.close();
}

main();
