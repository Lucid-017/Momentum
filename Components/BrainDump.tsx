// the 3-task zone
import React from 'react'


const BrainDump = ({dump}:any) => {
  return (
    <div>
        <header className="pb-2 text-sm font-medium tracking-wide text-muted-foreground">BRAIN DUMP</header>
        <div>
            <textarea
              placeholder='What are you thinking about today?'
              className='w-full resize-none overflow-y-auto rounded-xl border border-border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
              name="braindump"
              id="braindump"
              rows={5}
              value={dump}
              onChange={(e)=>{}}
            ></textarea>
        </div>
    </div>
  )
}

export default BrainDump
