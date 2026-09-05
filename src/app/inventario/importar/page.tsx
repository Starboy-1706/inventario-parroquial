import { authPageMetadata, requireAuthenticated } from "@/lib/auth";
import { ImportInventory } from "@/components/import-inventory";
export const dynamic="force-dynamic"; export async function generateMetadata(){return authPageMetadata("Importar inventario");} export default async function Page(){await requireAuthenticated();return <ImportInventory/>;}
