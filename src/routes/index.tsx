import { A } from "@solidjs/router";

export default function Home() {
  return (
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-6">Welcome</h1>
      
      <div class="prose prose-lg max-w-none text-base-content">
        <p class="text-lg mb-6">
          This is your new <em>vault</em>.
        </p>
        
        <p class="mb-6">
          Make a note of something,{" "}
          <A href="/about" class="text-primary hover:underline">
            create a link
          </A>
          , or try{" "}
          <A href="/about" class="text-primary hover:underline">
            the Importer
          </A>
          !
        </p>
        
        <p class="mb-6">
          When you're ready, delete this note and make the vault your own.
        </p>
        
        <div class="space-y-2">
          <p>
            <A href="/" class="text-primary hover:underline">
              foo
            </A>
          </p>
          <p>
            <A href="/about" class="text-primary hover:underline">
              bar
            </A>
          </p>
        </div>
      </div>
    </div>
  );
}
