/* MORE · configuration
   demo : true = crée un compte de démonstration « Moi » (mot de passe 1234) au premier lancement.
   Laisse false pour un usage réel. */
window.MORE_CONFIG = {
  demo: false,
  version: "1.1",
  /* Synchronisation (optionnelle) : renseigne ces deux valeurs pour que tes amis n'aient rien à saisir.
     La clé « anon public » peut être publique : les règles RLS de Supabase protègent les données. */
  supabaseUrl: "",          /* ex. "https://abcdefgh.supabase.co" */
  supabaseKey: "",          /* clé anon public (commence par eyJ…) */
  allowSignup: true         /* false = masque « Créer le compte » (inscriptions sur invitation uniquement) */
};
