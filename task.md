# Tour 2 — Rôles, tâches, espaces de travail, Android/Windows

## Décisions
- Établissement = compte du directeur (owner). Le directeur invite des membres (email + rôle) dans « Équipe ».
  Un membre se connecte (Google ou email) avec cet email → rattaché automatiquement à l'établissement.
- Middleware `authed` : context.user.id = id de l'établissement (owner) ; context.me = {userId, nom, email, role, membreId, enseignant}.
- Rôles (lib/roles.ts partagé) : directeur, secretariat, comptable, enseignant, surveillant, bibliothecaire, intendant.
  Permissions par module read/write, vérifiées côté serveur (crud(table, {module})).
- Nouvelles tables : membres, taches, notes (saisie profs par matière, statut Brouillon/Soumis/Validé), journal.
  documents : + roleResponsable, fichierUrl, fichierNom. taches : fichierUrl/fichierNom.
- Pages : /espace (Mon espace, par rôle), /taches, /equipe (directeur : membres, charge, journal), /saisie-notes.
- Tâches automatiques : taches.generer (impayés→comptable, docs expirant→secrétariat, retards livres→bibliothécaire,
  absences non justifiées→surveillant, notes manquantes→enseignant concerné, salles en travaux→intendant).
- Upload fichiers Tigris (upload.presign).
- Android + Windows : PWA installable (manifest + service worker + bouton Installer) ; Electron desktop (Windows NSIS).

## Avancement
- [ ] schema + db:push
- [ ] roles.ts, middleware, crud permissions + journal
- [ ] routes: membres, taches, notes, upload, eleves lite
- [ ] client: layout filtré, espace, taches, equipe, saisie-notes, bulletins tab, documents upload
- [ ] PWA + desktop
- [ ] build/lint/test multi-rôles
