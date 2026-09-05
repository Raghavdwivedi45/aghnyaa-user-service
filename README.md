npm run dev → runs TypeScript directly with automatic reload.
npm run build → compiles .ts files into dist/.
npm start → runs the compiled JavaScript from dist/.


sh: 1: tsx: not found means the tsx package is not installed (or isn't available in your project's node_modules/.bin).
Step 1: Check if it's installed -> Run: -> npm ls tsx
If you get something like: -> (empty) -> then tsx isn't installed.
Step 2: Install it -> For development, install it as a dev dependency: -> npm install --save-dev tsx


app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }))
It tells the browser that your server allows requests that include credentials, such as: Cookies, HTTP authentication (Basic/Auth headers), TLS client certificates
For example, if your frontend sends: fetch("http://localhost:5000/api", { credentials: "include" });
or with Axios: axios.get("http://localhost:5000/api", { withCredentials: true });
then the backend must have: credentials: true
Otherwise, the browser will block cookies from being sent or received.
When you enable credentials, you cannot use: origin: "*"
The server must specify the exact allowed origin, such as: cors({origin: "http://localhost:3000", credentials: true})


## Mailer & env loading order

### The symptom
Sending mail failed with:

    connect ECONNREFUSED 127.0.0.1:587

…even though a console.log printed all the MAIL_* env vars correctly at request time.
That combination (values look right, yet it connects to localhost) is the tell-tale sign
of an *env-loading-order* bug, not a missing .env value.

### Why it happened
Two moments in time matter, and env was only loaded at one of them:

1. **Module import time** — when `src/utils/mail.util.ts` was first imported, it ran
   `createTransport({ host: process.env.MAIL_HOST, port: Number(process.env.MAIL_PORT), ... })`
   immediately, at the top level.
2. **Request time** — when an HTTP request later called `sendEmail()`.

This project is ESM (`"type": "module"`). In ESM, **all `import` statements are hoisted and
fully executed before any plain statement in the file runs.** So in `src/index.ts` the old code:

    import dotenv from "dotenv";
    dotenv.config({})            // <- a STATEMENT, runs AFTER all imports

meant the import chain
`index.ts → user.routes → user.controllers → mail.util.ts`
executed — and built the transporter — *before* `dotenv.config()` ever ran.

At that point `process.env.MAIL_HOST` was `undefined`, so nodemailer fell back to `localhost`,
and `Number(undefined)` → `NaN`, so it fell back to its default submission port `587`.
Hence `127.0.0.1:587`. The transporter was frozen with those bad values forever.

The console.log printed correct values because it ran at **request time**, by which point
`dotenv.config()` had already run — too late to affect the already-built transporter.

### The fix (two parts)

**1. Build the transporter lazily — `src/utils/mail.util.ts`**
Instead of creating the transporter at import time, create it on first use and cache it:

    let transporter: Transporter | undefined;

    export function getTransporter(): Transporter {
        if (!transporter) {                       // runs only on the first call
            transporter = createTransport({ host: process.env.MAIL_HOST, ... });
        }
        return transporter;                       // reused on every later call (singleton)
    }

Because `createTransport` no longer runs during import, the env vars are read at first
`sendEmail()` call — which always happens *after* dotenv has loaded. This makes the mailer
immune to import ordering entirely. It is still created exactly once; just later.

**2. Load env as a side-effect import — `src/index.ts`**
Changed:

    import dotenv from "dotenv";
    dotenv.config({})

to:

    import "dotenv/config";

`import "dotenv/config"` loads the .env *during* the import phase (not as a later statement),
and placed on line 1 it runs before every import below it. This is defense-in-depth: it
guarantees `process.env` is populated before any other module evaluates, protecting any future
module that might read env at import time — not just the mailer.


user streak can update by -> create-draft, update-draft, publish draft, edit published type, click some article to read it
user streak model depends on user performance model...whenever latter changes former has to change