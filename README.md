# Local Media Player

Application web de lecture de médias locaux (audio et vidéo) construite avec Next.js, TypeScript et React. Elle permet de gérer une bibliothèque locale, de créer des playlists, lire des fichiers depuis l'appareil, et profiter d'une expérience de lecture fluide avec support des grands formats multimédias.

## Fonctionnalités

- Lecture locale de fichiers audio et vidéo
- Indexation locale via IndexedDB
- Gestion des playlists et historique de lecture
- Égaliseur et réglages de lecture
- Lecture plein écran
- Interface moderne et réactive
- Intégration avec l'API Gemini pour des fonctionnalités IA
- Synchronisation de périphériques et import de médias

## Stack technique

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- IndexedDB
- Gemini API
- Playwright

## Prérequis

- Node.js 20+
- Bun (recommandé) ou npm
- Un navigateur moderne

## Installation

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/Manasse-tech/media-local-.git
   cd media-local-
   ```

2. Installez les dépendances :
   ```bash
   bun install
   ```
   ou
   ```bash
   npm install
   ```

3. Configurez les variables d'environnement :
   ```bash
   cp .env.example .env.local
   ```

4. Renseignez les valeurs nécessaires dans le fichier `.env.local`.

## Variables d'environnement

Le projet utilise les variables suivantes :

- `GEMINI_API_KEY` : clé API Gemini pour les appels IA
- `APP_URL` : URL publique de l'application

Exemples disponibles dans `.env.example`.

## Démarrage

Pour lancer le projet en mode développement :

```bash
bun run dev
```

ou

```bash
npm run dev
```

L'application est ensuite accessible sur :

```text
http://localhost:3000
```

## Scripts disponibles

```bash
bun run dev     # démarrage du serveur de développement
bun run build   # build de production
bun run start   # démarrage de la version buildée
bun run lint    # vérification ESLint
bun run clean   # nettoyage du build Next.js
```

## Structure du projet

```text
.
├── app/                 # application Next.js
├── backend/            # logique backend / synchronisation
├── components/         # composants UI
├── context/            # contextes React
├── hooks/              # hooks personnalisés
├── lib/                # bibliothèques utilitaires
├── public/             # ressources statiques
├── scripts/            # scripts utilitaires
├── types/              # types TypeScript
├── utils/              # fonctions utilitaires
├── .env.example        # exemple de variables d'environnement
├── .gitignore
├── eslint.config.mjs
├── metadata.json
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── LICENSE
├── README.md
└── bun.lock
```

## Développement

Les contributions sont les bienvenues. Veuillez vous assurer de maintenir le code lisible, de suivre les conventions TypeScript/React et de lancer les vérifications avant de soumettre une PR.

## Licence

Ce projet est distribué sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## Contact

Pour toute question ou suggestion, vous pouvez ouvrir une issue sur GitHub ou contacter le propriétaire du dépôt.
