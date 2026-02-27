# Guide de Déploiement - Authentification Interne

Ce guide explique comment migrer de Auth0 vers l'authentification interne.

## Résumé des Changements

- **Backend**: Nouveau système d'authentification avec bcryptjs + jsonwebtoken
- **Frontend**: Modal de connexion intégré à la navbar
- **Routes API**: `/auth/register`, `/auth/login`, `/auth/me`

---

## Étape 1: Trouver le mot de passe de la base de données

### Option A: Via Azure Key Vault
1. Va sur [Azure Portal](https://portal.azure.com)
2. Cherche "Key Vaults" dans la barre de recherche
3. Si tu as un Key Vault, regarde dans les Secrets

### Option B: Réinitialiser le mot de passe
1. Va sur [Azure Portal](https://portal.azure.com)
2. Cherche `pg-petitemaison-5a710650`
3. Clique sur **Reset password**
4. Définis un nouveau mot de passe et **sauvegarde-le quelque part!**

---

## Étape 2: Exécuter la migration SQL

### Via Azure CLI

Ouvre un terminal et exécute:

```
bash
# 1. Se connecter à Azure
az login

# 2. Exécuter la migration (ajoute la colonne password_hash)
az postgres flexible-server execute \
  --name pg-petitemaison-5a710650 \
  --database-name petite_maison \
  --resource-group rg-petitemaison \
  --query-text "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);"
```

### Via Azure Portal

1. Va sur `pg-petitemaison-5a710650` dans Azure Portal
2. Clique sur **Query Editor**
3. Connecte-toi avec `pmadmin` et ton mot de passe
4. Copie-colle et exécute:

```
sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
```

---

## Étape 3: Configurer les Secrets Azure (Backend)

Exécute ces commandes dans ton terminal (remplace `TON_MOT_DE_PASSE` par le mot de passe que tu as trouvé ou créé):

```
bash
# Secrets pour petite-maison-api

# db-host
az containerapp secret set \
  --name petite-maison-api \
  --resource-group rg-petitemaison \
  --secrets "db-host=pg-petitemaison-5a710650.postgres.database.azure.com"

# db-port
az containerapp secret set \
  --name petite-maison-api \
  --resource-group rg-petitemaison \
  --secrets "db-port=5432"

# db-user
az containerapp secret set \
  --name petite-maison-api \
  --resource-group rg-petitemaison \
  --secrets "db-user=pmadmin"

# db-password (remplace par TON_MOT_DE_PASSE)
az containerapp secret set \
  --name petite-maison-api \
  --resource-group rg-petitemaison \
  --secrets "db-password=TON_MOT_DE_PASSE"

# db-name
az containerapp secret set \
  --name petite-maison-api \
  --resource-group rg-petitemaison \
  --secrets "db-name=petite_maison"

# jwt-secret
az containerapp secret set \
  --name petite-maison-api \
  --resource-group rg-petitemaison \
  --secrets "jwt-secret=JwtSecret2024!LaPetiteMaison123"
```

---

## Étape 4: Redémarrer le Backend

```
bash
az containerapp restart \
  --name petite-maison-api \
  --resource-group rg-petitemaison
```

---

## Étape 5: Variables GitHub Actions

Va dans **GitHub** → **Settings** → **Secrets and variables** → **Actions**

### Variables (pas secrets):
| Nom | Valeur |
|-----|--------|
| `AZURE_RESOURCE_GROUP` | `rg-petitemaison` |
| `VITE_API_URL` | URL de ton backend |

---

## Vérification

Après le redémarrage, teste l'API:

```
bash
# Tester la santé du backend
curl https://ton-backend.azurecontainerapps.io/health

# Tester l'inscription
curl -X POST https://ton-backend.azurecontainerapps.io/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123456"}'

# Tester la connexion
curl -X POST https://ton-backend.azurecontainerapps.io/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123456"}'
```

---

## Dépannage

### Erreur: "password_hash column doesn't exist"
→ La migration SQL n'a pas été exécutée. Voir Étape 2.

### Erreur: "Invalid credentials"
→ Le mot de passe DB est incorrect. Voir Étape 3.

### Erreur: "JWT_SECRET not set"
→ Le secret jwt-secret n'a pas été configuré. Voir Étape 3.

---

## Informations de connexion Azure

| Élément | Valeur |
|---------|--------|
| Resource Group | `rg-petitemaison` |
| PostgreSQL Server | `pg-petitemaison-5a710650` |
| Endpoint | `pg-petitemaison-5a710650.postgres.database.azure.com` |
| Database | `petite_maison` |
| Admin | `pmadmin` |

---

## Token JWT

- **Durée**: 7 jours
- **Stockage**: localStorage dans le navigateur
- **Nom du token**: `auth_token`
