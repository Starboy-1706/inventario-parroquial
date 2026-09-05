import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, categories, items, movements, zones } from "@/db/schema";
import { apiAuthGuard } from "@/lib/auth";

function splitCsv(line: string, sep: string) {
  const out: string[] = []; let value = "", quoted = false;
  for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { if (quoted && line[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; } else if (ch === sep && !quoted) { out.push(value.trim()); value = ""; } else value += ch; }
  out.push(value.trim()); return out;
}
function enumStatus(v: string) { const s = v.toUpperCase(); if (s.includes("PREST")) return "PRESTADO"; if (s.includes("MANT")) return "MANTENIMIENTO"; if (s.includes("BAJA")) return "BAJA"; return "DISPONIBLE"; }
function enumCondition(v: string) { const s = v.toUpperCase(); if (s.includes("EXCEL")) return "EXCELENTE"; if (s.includes("REGULAR")) return "REGULAR"; if (s.includes("DETER")) return "DETERIORADO"; return "BUENO"; }

export async function POST(request: NextRequest) {
  const denied = await apiAuthGuard(); if (denied) return denied;
  const text = await request.text();
  if (!text || text.length > 1_000_000) return NextResponse.json({ error: "Archivo vacío o demasiado grande (máx. 1 MB)." }, { status: 400 });
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2 || lines.length > 201) return NextResponse.json({ error: "El CSV debe contener entre 1 y 200 artículos." }, { status: 400 });
  const sep = lines[0].includes(";") ? ";" : ","; const headers = splitCsv(lines[0], sep).map((x) => x.toLowerCase());
  const idx = (...names: string[]) => names.map((n) => headers.indexOf(n)).find((i) => i >= 0) ?? -1;
  const nameI=idx("nombre"), zoneI=idx("zona"), typeI=idx("tipo"), qtyI=idx("cantidad"), minI=idx("stock mínimo","stock minimo"), catI=idx("categoría","categoria"), statusI=idx("estado"), condI=idx("conservación","conservacion"), descI=idx("descripción","descripcion"), notesI=idx("notas internas");
  if(nameI<0||zoneI<0)return NextResponse.json({error:"El CSV necesita columnas Nombre y Zona."},{status:400});
  const [zoneRows, catRows, [settings]] = await Promise.all([db.select().from(zones), db.select().from(categories), db.select().from(appSettings).where(eq(appSettings.id,1))]);
  const rows = lines.slice(1).map((line,rowIndex)=>{const c=splitCsv(line,sep);const zone=zoneRows.find(z=>z.name.toLowerCase()===String(c[zoneI]??"").toLowerCase());const category=c[catI]||"Otros";const errors:string[]=[];if(!c[nameI])errors.push("Nombre vacío");if(!zone)errors.push("Zona desconocida");const cat=catRows.find(x=>x.name.toLowerCase()===category.toLowerCase()&&x.active);if(!cat)errors.push("Categoría desconocida");const type=/acumulable|contable/i.test(c[typeI]||"")?"CONTABLE":"UNICO";const quantity=type==="UNICO"?1:Number(c[qtyI]||0);const minQuantity=type==="UNICO"?0:Number(c[minI]||0);if(!Number.isInteger(quantity)||quantity<0)errors.push("Cantidad inválida");if(!Number.isInteger(minQuantity)||minQuantity<0)errors.push("Stock mínimo inválido");return{row:rowIndex+2,name:c[nameI]?.slice(0,160),zoneId:zone?.id,zone:c[zoneI],category:cat?.name??category,type,quantity,minQuantity,status:enumStatus(c[statusI]||""),condition:enumCondition(c[condI]||""),description:c[descI]?.slice(0,2000)||null,notes:c[notesI]?.slice(0,2000)||null,errors};});
  const valid=rows.filter(r=>!r.errors.length).length, invalid=rows.length-valid;
  if (request.nextUrl.searchParams.get("commit") !== "1") return NextResponse.json({ rows, valid, invalid });
  if (invalid) return NextResponse.json({ error: "Corrige todas las filas antes de importar.", rows, valid, invalid }, { status: 400 });
  const prefix=(settings?.inventoryPrefix||"PSB").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6)||"PSB";
  const created = await db.transaction(async(tx)=>{const output=[];for(const r of rows){const seq=await tx.execute(sql`select nextval('inventory_code_seq')::int as n`);const n=Number(seq.rows[0].n);const code=`${prefix}-${String(n).padStart(6,"0")}`;const[item]=await tx.insert(items).values({inventoryNumber:n,code,name:r.name,zoneId:r.zoneId!,category:r.category,itemType:r.type,quantity:r.quantity,minQuantity:r.minQuantity,status:r.status,condition:r.condition,description:r.description,notes:r.notes}).returning();await tx.insert(movements).values({itemId:item.id,type:"ALTA",quantity:item.quantity,note:"Importación CSV validada"});output.push(item);}return output;});
  return NextResponse.json({ ok:true, count:created.length }, { status:201 });
}
