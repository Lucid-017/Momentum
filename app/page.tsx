"use client"
// dashboard (the whole app for now)
import Image from "next/image";
import target from '../public/assets/target-svgrepo-com.svg'
import { useEffect, useState } from "react";
import FocusTasks from "@/Components/FocusTasks";
import { supabase } from "@/lib/supabase";
import {v4 as uuidv4} from 'uuid'
import BrainDump from "@/Components/BrainDump";

export default function Home() {
  // const [userId,setUserId]=useState<string|null>(null);
  const [brainDump,setBrainDump]=useState<string>('');
  const [tasks,setTasks]=useState<[]>();

  const date =new Date();
  const today = date.toISOString().split('T')[0];

  // on mount →
  // check localStorage for 'momentum_user_id' →
  //   found   → read it, set in state
  //   missing → generate uuid, save to localStorage, set in state
  // once userId is in state → render FocusTasks with userId prop

    const testDb = async () => {
    const { data: entry, error: entriesError } = await supabase
      .from('entries')
      .select(`*,tasks ( id, text, done, position)`)
      .eq('user_id', 'test-user-001')
      .eq('date', today)
      .order('position', { referencedTable: 'tasks' })
      .single()
    if (entriesError) {
      console.error('entries error:', entriesError.message, entriesError.details, entriesError.hint)
    }
    else {
      setBrainDump(entry?.brain_dump ?? '')
      setTasks(entry.tasks)
      console.log('entry: ',entry?.brain_dump)
      console.log('whole entry: ',entry)
    }
    }



useEffect(() => {
  // const localStoredUserid = localStorage.getItem("momentum_user_id")
  // const uid = localStoredUserid ?? 'test-user-001'
  // if(!localStoredUserid) localStorage.setItem("momentum_user_id", uid)
  // setUserId(uid)


  testDb()
}, [])


  return (
    <div className="min-h-screen bg-background px-6 py-6 text-foreground sm:px-10">
    <nav className="flex items-center justify-between border-b border-border pb-4">
      <div className="logo flex items-center gap-2">
        <Image src={target} height={32} width={32} alt="target"/>
        <div className="flex items-baseline gap-2">
          <p className="font-semibold">Momentum</p>
          <span className="text-sm text-muted-foreground">daily focus</span>
        </div>
      </div>
      <div className="time flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
          <p>U</p>
        </div>
      </div>
    </nav>
    <header className="my-8">
      {/* this name has to be gotten somehow from the user */}
      <h1 className="text-3xl font-semibold tracking-tight">Good morning, Uche.</h1>
      <p className="mt-1 text-muted-foreground">3 thing. That's all today needs.</p>
    </header>
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {/* today's Focus */}
      <div>
        <p className="pb-2 text-sm font-medium tracking-wide text-muted-foreground">TODAY'S FOCUS</p>
        <FocusTasks tasks={tasks}/>
      </div>
      {/* brain dump*/}
      <div>
        <BrainDump dump={brainDump}/>
      </div>
      {/* time audit*/}
      {/* STREAK*/}
    </div>
    </div>
  );
}
