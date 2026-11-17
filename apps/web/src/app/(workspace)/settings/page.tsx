import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { CompanySettingsForm } from "@/components/company-settings-form";
export default async function Settings(){const user=await currentUser();if(!user?.roles.includes("OWNER"))notFound();const settings=await db.companySetting.findUnique({where:{id:"company"}});return <><div className="mb-7"><p className="text-xs text-slate-400">Administration / Settings</p><h1 className="mt-2 text-2xl font-semibold">Company settings</h1><p className="mt-1 text-sm text-slate-500">Company identity and the timezone used for daily operations.</p></div><CompanySettingsForm name={settings?.displayName??"HEXVAULT"} timezone={settings?.timezone??"Asia/Kolkata"}/></>}
