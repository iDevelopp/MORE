# MORE — My Own Rep Evolution

**Version 1.1 (V1.1)** · Application web privée de suivi de musculation · *Uplift yourself.*

MORE est un carnet d'entraînement pensé pour l'iPhone : on note ses séances (machines, haltères, tapis de sol, tapis de course) et on suit sa progression en courbes. L'app fonctionne entièrement dans le navigateur, s'ajoute à l'écran d'accueil comme une vraie application et peut, en option, se synchroniser avec un projet Supabase, avec un chiffrement de bout en bout.

> Projet personnel à usage privé. Code propriétaire, tous droits réservés — voir [LICENSE](LICENSE).

---

## Fonctionnalités

- **Saisie par type d'exercice** : Machine, Haltères, Tapis de sol (séries + durée, poids facultatif), Tapis de course (durée, distance, pente).
- **Progression** : exercices classés en *En progrès*, *Stable* et *À reprendre*, courbes par exercice (charge, volume, 1RM estimé, répétitions, durée, distance, vitesse).
- **Séance guidée** : programmes, tapis d'échauffement en premier, poids pré-remplis, minuteur de repos automatique.
- **Suggestion de charge** (surcharge progressive) et **records** avec badge PR.
- **Historique** : volume par séance, poids levé, répétitions selon le poids, calendrier mensuel, notes de séance.
- **Mon corps** : poids, taille, IMC et courbe de poids.
- **Jusqu'à 3 comptes** par téléphone, données chiffrées localement.
- **Synchronisation chiffrée de bout en bout** (option) : le serveur ne stocke qu'un bloc illisible.
- **Thème** sombre, clair ou automatique ; animations respectant « Réduire les animations ».

## Structure du projet

```
index.html               Page de présentation (vidéo, accès à l'app)
app.html                 L'application
manifest.webmanifest     Nom, icône et couleurs pour l'écran d'accueil
css/style.css            Styles (thèmes, composants, animations)
js/config.js             Configuration (mode démo, version)
js/theme-boot.js         Applique le thème avant l'affichage
js/core.js               Utilitaires, thème
js/data.js               Données de départ et validation des données entrantes
js/crypto.js             Comptes locaux chiffrés (PBKDF2 + AES-GCM)
js/domain.js             Exercices, groupes musculaires, mesures, records
js/charts.js             Graphiques SVG
js/views.js              Écrans Progrès, Historique, Records, Mon corps
js/form.js               Formulaire d'ajout d'une série
js/exercise.js           Fiche d'un exercice
js/workout.js            Minuteur, programmes, séance en cours
js/sync.js               Synchronisation Supabase (optionnelle)
js/settings.js           Réglages
js/app.js                Navigation, animations, verrou, démarrage
assets/                  Icônes de l'application
.htaccess                En-têtes de sécurité (hébergement Apache)
supabase/schema.sql      Table et règles de sécurité pour Supabase
```

Aucune dépendance, aucune étape de compilation : les fichiers sont servis tels quels. L'ordre des scripts dans `app.html` compte.

## Installer sur iPhone (GitHub Pages)

1. Crée un dépôt GitHub (par ex. `more`) et envoie-y le contenu de ce dossier (voir plus bas).
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
3. Après une minute, l'app est en ligne à l'adresse `https://<ton-pseudo>.github.io/more/`.
4. Sur l'iPhone, ouvre cette adresse dans **Safari** → bouton **Partager** → **Sur l'écran d'accueil**.
5. Ouvre toujours MORE depuis cette icône. Au premier lancement, crée ton compte (8 caractères minimum) et coche « Ajouter mes séances de départ » si tu veux retrouver tes séances d'octobre–novembre.

> Avec un compte GitHub gratuit, GitHub Pages exige un dépôt **public** : le code est visible, mais **tes données ne sont jamais dans le dépôt** (elles restent sur ton téléphone, chiffrées). Pour garder aussi le code privé, héberge le dépôt privé sur Cloudflare Pages ou Netlify (offres gratuites).

### Envoyer le code sur GitHub

**Sans ligne de commande** : sur github.com, *New repository* → nom `more` → *Create* → *uploading an existing file* → glisse **tout le contenu** du dossier (y compris `css/`, `js/`, `assets/`, `supabase/` et le fichier `.nojekyll`) → *Commit changes*.

**Avec Git** :

```bash
cd more
git init
git add .
git commit -m "MORE V1"
git branch -M main
git remote add origin https://github.com/<ton-pseudo>/more.git
git push -u origin main
```

## Synchronisation avec Supabase (optionnelle)

Sert à sauvegarder les données en ligne et à utiliser l'app sur plusieurs téléphones (toi et un ami, chacun son compte).

1. Crée un projet gratuit sur [supabase.com](https://supabase.com) (région Europe conseillée).
2. **SQL Editor** → colle le contenu de [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. **Authentication → URL Configuration** : mets l'adresse GitHub Pages de l'app dans *Site URL*.
4. **Project Settings → API** : note l'adresse du projet (`https://xxxx.supabase.co`) et la clé **anon public**.
5. Dans MORE : **Réglages → Synchronisation** → colle l'adresse et la clé, saisis ton e-mail, un mot de passe en ligne et une **phrase secrète** (12 caractères minimum) → **Créer le compte**, puis **Se connecter**. Ton ami fait de même sur son téléphone, avec sa propre phrase.
6. Une fois vos deux comptes créés : **Authentication → Sign In / Providers → Email** → désactive **Allow new users to sign up**. Plus personne d'autre ne peut s'inscrire.
7. Active la double authentification sur ton compte Supabase (le tableau de bord).

La clé *anon public* est faite pour être visible : la protection repose sur les règles RLS du schéma (chacun ne lit et n'écrit que sa propre ligne) et sur la fermeture des inscriptions.

### Chiffrement de bout en bout

Avant chaque envoi, MORE chiffre le carnet **sur le téléphone** (AES-GCM 256 bits, clé dérivée de la phrase secrète par PBKDF2-SHA-256, 250 000 itérations). Supabase ne reçoit que `{ v, salt, iv, ct }` : ni l'administrateur du projet ni Supabase ne peuvent lire les séances. La phrase n'est jamais envoyée ; elle est gardée dans le compte local, lui-même chiffré.

- **Mot de passe en ligne** : sert à se connecter, réinitialisable par e-mail.
- **Phrase secrète** : sert à lire les données, **non récupérable**. À noter dans un gestionnaire de mots de passe.
- Sur un nouveau téléphone : même e-mail, même mot de passe, **même phrase**.

## Configuration

`js/config.js` :

| Clé | Rôle |
|---|---|
| `demo` | `true` crée un compte de démonstration « Moi » (mot de passe `1234`) au premier lancement. **Laisser `false` en usage réel.** |
| `version` | Numéro affiché dans les Réglages. |
| `supabaseUrl` | Adresse du projet Supabase. Si renseignée avec `supabaseKey`, les utilisateurs n'ont plus à la saisir. |
| `supabaseKey` | Clé **anon public** (legacy, commence par `eyJ…`). Elle peut être publique : la protection repose sur les règles RLS. Ne jamais mettre la clé `service_role`. |
| `allowSignup` | `false` masque le bouton « Créer le compte » : inscriptions sur invitation uniquement. |

## Inviter des proches

1. Renseigne `supabaseUrl` et `supabaseKey` dans `js/config.js`, mets `allowSignup: false`, puis publie.
2. Dans Supabase : **Authentication → Users → Add user → Create new user** (e-mail + mot de passe provisoire, *Auto Confirm User* coché). Transmets-lui ces identifiants.
3. Il ouvre l'adresse de l'app, crée son compte MORE local, puis **Réglages → Synchronisation** : e-mail, mot de passe et **sa propre phrase secrète** → **Se connecter**.
4. Laisse **Allow new users to sign up** désactivé : personne ne peut s'inscrire sans ton invitation.

Chacun a ses données chiffrées avec sa propre phrase : personne, toi compris, ne peut lire celles des autres.

## Héberger ailleurs (alwaysdata, Apache…)

Le site est statique : il suffit de copier les fichiers dans le dossier web (par SFTP ou `git pull`). Le fichier `.htaccess` fourni ajoute des en-têtes de sécurité que GitHub Pages ne permet pas (CSP avec `frame-ancestors`, HSTS, `X-Frame-Options`, redirection HTTPS, blocage de `.git`). Après un changement d'adresse, mettre à jour *Site URL* dans Supabase.

## Développer en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Ne pas ouvrir `app.html` en double-cliquant (`file://`) : la politique de sécurité et le chiffrement exigent une adresse `http://localhost` ou `https://`.

## Sécurité

Résumé des protections et des limites dans [SECURITY.md](SECURITY.md).

## Licence

Logiciel propriétaire, usage privé. Tous droits réservés. Fourni « tel quel », sans aucune garantie. Voir [LICENSE](LICENSE).
