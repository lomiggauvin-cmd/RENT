# 🚀 Guide de Démarrage RentaVision

> Ce guide est conçu pour être suivi **étape par étape**, même sans expérience technique.
> Durée estimée : **30 à 45 minutes** pour avoir l'application en ligne.

---

## Ce dont vous avez besoin

Avant de commencer, créez des comptes gratuits sur ces services :

| Service | Lien | Pourquoi |
|---|---|---|
| **GitHub** | https://github.com | Héberger le code |
| **Vercel** | https://vercel.com | Mettre l'app en ligne |
| **Supabase** | https://app.supabase.com | Base de données + authentification |

---

## ÉTAPE 1 — Installer les outils sur votre ordinateur

### 1.1 Installer Node.js

1. Allez sur https://nodejs.org
2. Cliquez sur le bouton **"LTS"** (version recommandée)
3. Téléchargez et installez (cliquez simplement "Suivant" partout)
4. Vérification : ouvrez le Terminal (Mac) ou l'Invite de commandes (Windows) et tapez :
   ```
   node --version
   ```
   Vous devriez voir quelque chose comme `v20.x.x` ✅

### 1.2 Installer Git

- **Mac** : tapez `git --version` dans le Terminal — il s'installera automatiquement
- **Windows** : téléchargez sur https://git-scm.com et installez

---

## ÉTAPE 2 — Configurer Supabase (base de données)

### 2.1 Créer un projet Supabase

1. Allez sur https://app.supabase.com
2. Cliquez **"New Project"**
3. Choisissez un nom (ex: `rentavision`) et un mot de passe fort
4. Sélectionnez la région **"West EU (Ireland)"** pour de meilleures performances
5. Cliquez **"Create new project"** — attendez 1-2 minutes

### 2.2 Créer les tables de la base de données

1. Dans votre projet Supabase, cliquez sur **"SQL Editor"** dans le menu de gauche
2. Cliquez **"New query"**
3. Ouvrez le fichier `supabase/schema.sql` (dans le dossier du projet)
4. Copiez **tout son contenu** et collez-le dans l'éditeur SQL
5. Cliquez **"Run"** (bouton vert en haut à droite)
6. Vous devriez voir "Success. No rows returned" ✅

### 2.3 Activer l'authentification Google (optionnel mais recommandé)

1. Dans Supabase, allez dans **Authentication → Providers**
2. Cliquez sur **Google**
3. Activez le toggle
4. Pour obtenir les clés Google :
   - Allez sur https://console.cloud.google.com
   - Créez un projet → Credentials → Create OAuth 2.0 Client ID
   - Type : "Web application"
   - Authorized redirect URI : `https://[votre-projet].supabase.co/auth/v1/callback`
   - Copiez le Client ID et Client Secret dans Supabase
5. Sauvegardez

### 2.4 Récupérer vos clés Supabase

1. Dans Supabase, allez dans **Settings → API**
2. Notez (copiez) ces valeurs :
   - **Project URL** (ressemble à `https://xxxxx.supabase.co`)
   - **anon public** key (longue chaîne de caractères)
   - **service_role** key (encore plus longue — gardez-la secrète !)

---

## ÉTAPE 3 — Préparer le code sur votre ordinateur

### 3.1 Placer le dossier du projet

1. Copiez le dossier `rentavision` (téléchargé depuis Claude) sur votre bureau ou dans vos Documents
2. Ouvrez le Terminal / Invite de commandes
3. Naviguez vers le dossier :
   ```bash
   # Mac/Linux
   cd ~/Desktop/rentavision
   
   # Windows
   cd C:\Users\VotreNom\Desktop\rentavision
   ```

### 3.2 Créer le fichier de configuration

1. Dans le dossier `rentavision`, copiez le fichier `.env.local.example` et renommez la copie en `.env.local`
2. Ouvrez `.env.local` avec un éditeur de texte (Notepad sur Windows, TextEdit sur Mac)
3. Remplacez les valeurs avec vos informations Supabase :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon-ici
   SUPABASE_SERVICE_ROLE_KEY=votre-clé-service-role-ici
   AIRDNA_API_KEY=votre-clé-airdna-ici
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```
4. Sauvegardez le fichier

### 3.3 Installer les dépendances

Dans le Terminal, dans le dossier `rentavision`, tapez :
```bash
npm install
```
Attendez que tout soit installé (1-3 minutes, vous verrez des messages défiler).

### 3.4 Lancer l'application en local

```bash
npm run dev
```

Ouvrez votre navigateur et allez sur **http://localhost:3000**

🎉 **Vous devriez voir la landing page de RentaVision !**

---

## ÉTAPE 4 — Mettre en ligne sur Vercel

### 4.1 Créer un dépôt GitHub

1. Allez sur https://github.com → cliquez **"New repository"**
2. Nom : `rentavision` → cliquez **"Create repository"**
3. Dans le Terminal (dans le dossier rentavision) :
   ```bash
   git init
   git add .
   git commit -m "Initial commit - RentaVision"
   git branch -M main
   git remote add origin https://github.com/VOTRE_PSEUDO/rentavision.git
   git push -u origin main
   ```
   (Remplacez `VOTRE_PSEUDO` par votre pseudo GitHub)

### 4.2 Déployer sur Vercel

1. Allez sur https://vercel.com → **"Add New Project"**
2. Importez votre dépôt GitHub `rentavision`
3. Cliquez **"Deploy"** — Vercel détecte automatiquement que c'est un projet Next.js ✅
4. Le premier déploiement va échouer car les variables d'environnement manquent — c'est normal.

### 4.3 Ajouter les variables d'environnement sur Vercel

1. Dans votre projet Vercel → **Settings → Environment Variables**
2. Ajoutez ces 4 variables (une par une) :

   | Nom | Valeur |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | votre URL Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | votre clé anon |
   | `SUPABASE_SERVICE_ROLE_KEY` | votre clé service role |
   | `AIRDNA_API_KEY` | votre clé AirDNA |
   | `NEXT_PUBLIC_BASE_URL` | votre URL Vercel (ex: `https://rentavision.vercel.app`) |

3. Allez dans **Deployments** → cliquez sur les 3 points → **"Redeploy"**

### 4.4 Configurer Supabase pour la production

1. Dans Supabase → **Authentication → URL Configuration**
2. Ajoutez votre URL Vercel dans **"Site URL"** : `https://rentavision.vercel.app`
3. Ajoutez dans **"Redirect URLs"** : `https://rentavision.vercel.app/auth/callback`

---

## ÉTAPE 5 — Brancher votre clé AirDNA

Le fichier `lib/market-api.ts` est prêt à recevoir votre clé. Selon votre plan AirDNA, vous devrez peut-être adapter le format de la réponse API. 

Consultez la documentation AirDNA pour l'endpoint exact correspondant à votre abonnement, puis mettez à jour la fonction `fetchMarketDataFromAPI` dans `lib/market-api.ts`.

En attendant, l'application utilise des **données simulées réalistes** basées sur la ville saisie — la simulation fonctionnera parfaitement.

---

## ✅ Vérification finale

Votre application est prête si vous pouvez :

- [ ] Accéder à la landing page
- [ ] Cliquer "Faire une simulation" → modal d'authentification apparaît
- [ ] Créer un compte et vous connecter
- [ ] Remplir le formulaire et cliquer "Lancer l'analyse"
- [ ] Voir le dashboard avec les 3 scénarios
- [ ] Sauvegarder un projet
- [ ] Le retrouver dans "Mes Projets"

---

## ❓ Problèmes fréquents

### "npm: command not found"
→ Node.js n'est pas installé. Reprenez l'étape 1.1.

### "Error: NEXT_PUBLIC_SUPABASE_URL is not defined"
→ Le fichier `.env.local` n'existe pas ou n'est pas au bon endroit (doit être à la racine du dossier `rentavision`).

### La page blanche / erreur 500
→ Ouvrez la console (F12 dans le navigateur) et regardez l'erreur. Vérifiez que vos clés Supabase sont correctes.

### L'auth Google ne fonctionne pas
→ Vérifiez que l'URL de callback dans Google Cloud Console est exactement `https://[votre-projet].supabase.co/auth/v1/callback`.

### Les données de marché ne se chargent pas
→ Normal si votre clé AirDNA n'est pas encore branchée. L'app utilise des données simulées automatiquement.

---

## 🔄 Pour les mises à jour futures

Après chaque modification du code :
```bash
git add .
git commit -m "Description de la modification"
git push
```
Vercel redéploie automatiquement en 1-2 minutes. 🚀

---

## 📁 Structure du projet

```
rentavision/
├── app/                        ← Pages de l'application
│   ├── page.tsx               ← Landing page
│   ├── simulation/page.tsx    ← Formulaire de simulation
│   ├── dashboard/page.tsx     ← Dashboard des résultats
│   ├── projets/page.tsx       ← Mes projets sauvegardés
│   └── api/                   ← API backend
│       ├── market-data/       ← Données de marché (AirDNA)
│       └── projects/          ← CRUD des projets
├── components/layout/          ← Composants partagés
│   ├── AuthModal.tsx          ← Modale de connexion
│   ├── AuthProvider.tsx       ← Gestion de session
│   └── Navbar.tsx             ← Navigation
├── lib/
│   ├── calculations/          ← Moteur de calcul financier
│   ├── market-api.ts          ← Intégration AirDNA
│   └── supabase.ts            ← Client base de données
├── supabase/schema.sql         ← Structure de la base de données
├── types/index.ts              ← Définitions TypeScript
└── .env.local                  ← Vos clés secrètes (à créer)
```

---

*Pour toute question, reprenez la conversation avec Claude et décrivez votre problème précisément.*
