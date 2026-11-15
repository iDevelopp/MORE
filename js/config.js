/* MORE · configuration
   demo : true = crée un compte de démonstration « Moi » (mot de passe 1234) au premier lancement.
   Laisse false pour un usage réel. */
window.MORE_CONFIG = {
  demo: false,
  version: "1.1",
  /* Synchronisation (optionnelle) : renseigne ces deux valeurs pour que tes amis n'aient rien à saisir.
     La clé « anon public » peut être publique : les règles RLS de Supabase protègent les données. */
  supabaseUrl: "https://ovsivgaqysabqxjskyeu.supabase.co",          /* ex. "https://abcdefgh.supabase.co" */
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92c2l2Z2FxeXNhYnF4anNreWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3NDU5MDYsImV4cCI6MjExMDMyMTkwNn0.4hKbtFq1zibV6IK560t4Xux8xGD3RKHxt9b_oKgQYr8",          /* clé anon public (commence par eyJ…) */
  allowSignup: false        /* false : pas de bouton « Créer un compte », c est toi qui crées les comptes dans Supabase */
};
