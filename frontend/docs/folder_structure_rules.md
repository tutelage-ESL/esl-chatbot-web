├─ app/
│  ├─ assets/
│  │  ├─ css/
│  │  │  ├─ main.css
│  │  │  └─ fonts.css
│  │  └─ fonts/
│  ├─ App.vue
│  └─ plugins/

├─ common/                  # data: (has all tehe data ts files, like country coede, nav-links...)
│  ├─ data/
│  ├─ model/                # has the model types, like we ave how many tables in the backend we create the types in mode folder for them...)
│  ├─ types/                # ( has the other ts types)
│  └─ schema/               # (has the v alidation schemas, which is zod!) |

├─ components/              # all the folders inside the component folder should start with a capital letter, except of the folders that belongs to a package and recognize by them , e.g: ui is for shadcn we dont rename it
│  ├─ APP/                  # has all the main UI components like Bbutoon, IconSax, Link, Text, Image...)
│  ├─ Form/                 # has all the components that related to form...
│  ├─ Layouts/              # has the layout components like 
│  ├─ Pages/                # has lall the components and folders for the pages, for example we have the landing page like this : 
│  │  └─ Home/
│  │     ├─ Hero.vue
│  │     └─ About.vue...
│  └─ Skeletons/            # has all the skeleton loading animations, seperated by folder and components for each page and each component

├─ composables/             # has all the reusable composables,  it can do more that one thing in one file but with different exported functouins and gotta be related to each other, and start with useExample()....
├─ layouts/                 # has the application layputs( recognizabvle by Nuxt)
├─ lib/                     # for utilities
├─ middleware/              # Nuxt Middleware 
├─ pages/                   # nuxt pages


