# King of Duel V2

V2 du projet King of Duel avec authentification, rôles/VIP, collection de cartes, decks, amis, tournois et panneau administrateur.

## Fonctionnalités
- Joueurs et comptes persistants dans `data/db.json`.
- Mot de passe protégé par `scrypt` avec sel aléatoire.
- Sessions serveur de 12 h.
- 8 rôles : PLAYER, VIP_1, VIP_2, VIP_3, ORGANIZER, JUDGE, ADMIN, SUPER_ADMIN.
- ADMIN/SUPER_ADMIN : toutes les cartes gratuitement et accès à tous les tournois.
- Lorsqu'un administrateur entre dans un tournoi comme joueur, le serveur marque le mode compétitif et les pouvoirs administratifs sont désactivés pour ce contexte.
- Main Deck de 40 à 60 cartes.
- Collection et création/suppression de decks.
- Liste d'amis.
- Jusqu'à 5 tournois officiels ; Top 5 récompensé.
- API de récompenses réservée à l'administration autorisée.
- Journal d'audit.
- Duel PNJ conservé et état du duel contrôlé côté serveur.
- Mode Test Admin : toutes les cartes disponibles sans les confondre avec l'usage compétitif.

## Installation
```bash
npm install
cp .env.example .env
# Modifier ADMIN_PASSWORD
npm start
```
Puis ouvrir `http://127.0.0.1:3000`.

### Termux
```bash
cd ~/king_of_duel_v2
git clone <URL_DU_PROJET> .
npm install
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD='mot-de-passe-fort'
npm start
```

## API principale
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/profile`
- `GET /api/collection`
- `POST /api/decks`
- `DELETE /api/decks/:id`
- `POST /api/friends/:username`
- `GET /api/tournaments`
- `POST /api/tournaments/:id/join`
- `POST /api/game`
- `POST /api/game/:id/action`
- `GET /api/admin/overview`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id/role`
- `POST /api/admin/tournaments`
- `POST /api/admin/rewards`
- `POST /api/admin/test-mode`

## Sécurité
Les permissions sont vérifiées côté serveur et par requête. Le client ne décide jamais à lui seul de l'accès à une fonction protégée. Pour une mise en production importante, remplacer le stockage JSON et les sessions mémoire par PostgreSQL + sessions persistantes/rotation de secrets.
