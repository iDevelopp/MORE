# Sécurité — MORE V1.1

Résumé de la revue de sécurité de la V1 et du chiffrement de bout en bout ajouté en V1.1 : ce qui est protégé, comment, et les limites connues.

## Où sont les données

| Mode | Emplacement | Protection |
|---|---|---|
| Local (par défaut) | Stockage du navigateur de l'iPhone | Chiffrées avec AES-GCM 256 bits ; clé dérivée du mot de passe (PBKDF2-SHA-256, 250 000 itérations, sel aléatoire par compte). Sans le mot de passe, les données sont illisibles. |
| Supabase (option) | Base Postgres du projet Supabase | **Chiffrées de bout en bout** : AES-GCM 256 bits avec une clé dérivée de la phrase secrète (PBKDF2-SHA-256, 250 000 itérations, sel aléatoire). Le serveur ne stocke qu'un bloc illisible. En plus, les règles RLS limitent chaque utilisateur à sa propre ligne. |

Le dépôt GitHub ne contient **aucune donnée personnelle ni aucun secret**.

## Protections en place

- **Injection de code (XSS)** : tout texte saisi est échappé avant affichage ; toutes les données venant d'une sauvegarde collée, du serveur ou du stockage passent par une validation stricte (identifiants, dates, nombres, groupes et types autorisés, tailles maximales) avant d'être utilisées. Testé avec une sauvegarde piégée : aucun code exécuté.
- **Content Security Policy** (balise meta) : scripts uniquement depuis le site lui-même, aucune ressource externe, connexions réseau limitées au site et à `*.supabase.co`, `base-uri` et `form-action` bloqués.
- **Anti-iframe** : en production, l'app refuse de s'afficher dans une autre page (protection contre le clickjacking).
- **Mots de passe** : 8 caractères minimum pour tout nouveau compte ou changement.
- **Force brute** : après 5 essais ratés, blocage de 30 s, puis 60 s, 120 s… jusqu'à 15 min. Le blocage est mémorisé même si on recharge la page.
- **Verrou automatique** après 5 minutes en arrière-plan ; bouton de verrouillage manuel.
- **Synchronisation** : seule une adresse `https://<projet>.supabase.co` est acceptée ; jetons de session et phrase secrète conservés dans les données locales chiffrées ; la phrase est vérifiée sur la sauvegarde existante avant d'être enregistrée ; un bloc modifié sur le serveur est rejeté (authentification GCM) ; une ancienne sauvegarde en clair est automatiquement rechiffrée.
- **Supabase** : RLS activé, accès anonyme révoqué, une règle par opération, taille des données limitée (`supabase/schema.sql`). Inscriptions à désactiver après la création des comptes.
- **Aucune dépendance externe** : pas de CDN, pas de polices distantes, pas de traqueur. `referrer` désactivé, page non indexée.

## Limites connues (V1)

- **Mot de passe oublié = données locales perdues** (aucune récupération possible, c'est le prix du chiffrement). Faire des sauvegardes (Réglages → Sauvegarde) ou activer Supabase.
- **Accès physique au téléphone déverrouillé** : quelqu'un pourrait supprimer les comptes (« Effacer tous les comptes »), sans pouvoir lire les données.
- **Phrase secrète oubliée = sauvegarde en ligne illisible** (les données du téléphone restent intactes). Aucune récupération possible, par conception.
- **Métadonnées visibles côté serveur** : e-mail du compte, date de dernière synchronisation, taille approximative du bloc chiffré.
- **Mode de secours** : si le navigateur ne fournit pas `crypto.subtle` (rare, hors HTTPS), le mot de passe protège l'accès mais les données ne sont pas chiffrées. Sur GitHub Pages (HTTPS), ce mode n'est pas utilisé.
- **En-têtes HTTP** : GitHub Pages ne permet pas de les configurer ; la CSP est donc fournie par balise meta (pas de `frame-ancestors`, compensé par l'anti-iframe en JavaScript).
- **`style-src 'unsafe-inline'`** : nécessaire pour les styles en ligne des graphiques ; sans impact sur l'exécution de scripts.

## Bonnes pratiques d'utilisation

1. Laisser `demo: false` dans `js/config.js`.
2. Choisir un mot de passe long et unique pour l'app et pour Supabase.
3. Activer Face ID / code sur l'iPhone.
4. Désactiver les inscriptions Supabase une fois les comptes créés, et activer la double authentification sur le compte Supabase.
5. Faire une sauvegarde régulière.
