# Plan de implementación: byb (Bastián & Beatriz)

**Stack:** Expo + React Native (**solo Android**, APK con EAS) · Supabase, proyecto **`byb`** (`hqdbebrqaweoindsrhli`, Postgres 17, us-west-2).
**Principio:** se aplica el Decision Ladder de Ponytail: cero librerías de UI, cero estado global, cero librería de formularios.

---

## 1. Decisiones confirmadas

| Tema | Decisión |
|---|---|
| Inicio de la relación | **Viernes 20-11-2026**. Hoy es 16-11, así que mientras no llegue esa fecha la pantalla muestra una **cuenta regresiva** ("Faltan 4 días") y después los **días juntos** |
| Calificación de películas | **Una por persona**: 1 a 5 corazones y una opinión cada uno |
| Edición | Botón **Editar** en salidas, películas y comidas, además de borrar |
| Plataforma | Solo Android. Durante el desarrollo se prueba en Expo Go y al final se genera un **APK con EAS** |
| Usuarios | Bastián (`basti2001.bc@gmail.com`) y Beatriz (`beapenas18@gmail.com`), con cuentas ya creadas y registros públicos desactivados |
| Contador | El 20-11-2026 es el **día 1** |

---

## 2. Dependencias (8 paquetes, todos con `npx expo install`)

| Necesidad | Paquete | Por qué |
|---|---|---|
| Backend y auth | `@supabase/supabase-js`, `react-native-url-polyfill` | Requerido |
| Sesión y caché persistidos | `expo-sqlite` (polyfill `localStorage`) | Recomendado por Supabase; se reutiliza para el caché |
| Caché y deduplicación | `@tanstack/react-query`, `@tanstack/react-query-persist-client`, `@tanstack/query-sync-storage-persister` | Estándar; hacerlo a mano sería más código y más bugs |
| Fuente | `@expo-google-fonts/inter` (pesos 400, 600 y 700) | Requisito de diseño |
| Fecha | `@react-native-community/datetimepicker` | Picker nativo de Android |

Ya vienen en el template: `expo-router`, `@expo/vector-icons`, `expo-font` y `expo-splash-screen`. Las fechas se formatean con `Intl.DateTimeFormat('es-CL')`, sin date-fns. Las versiones van fijas y el lockfile se commitea.

---

## 3. Base de datos

### 3.1 Modelo de acceso
- **Auth:** se desactiva *Allow new users to sign up* y se crean las dos cuentas en el Dashboard.
- **Autorización:** se guarda `app_metadata = {"couple": true, "name": "Bastián" | "Beatriz"}`. `app_metadata` no la puede editar el usuario, así que es segura para RLS.
- **Nombres en la UI:** el nombre propio sale del JWT. Para mostrar quién escribió cada reseña se usa un mapa constante `lib/couple.ts` con `{ [uuid]: 'Bastián', [uuid]: 'Beatriz' }`. Son dos usuarios fijos, así que no hace falta una tabla `profiles`.

### 3.2 Esquema

```sql
-- Helper reutilizado en todas las políticas
-- (se escribe inline; no se crea función para evitar SECURITY DEFINER)
-- (select auth.jwt() -> 'app_metadata' ->> 'couple') = 'true'

create table public.outings (
  id          bigint generated always as identity primary key,
  title       text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  happened_on date not null,
  created_at  timestamptz not null default now()
);

-- watched_on NULL = wishlist
create table public.movies (
  id         bigint generated always as identity primary key,
  title      text not null check (char_length(title) between 1 and 200),
  watched_on date,
  created_at timestamptz not null default now()
);

-- Una reseña por persona y película
create table public.movie_reviews (
  movie_id   bigint not null references public.movies(id) on delete cascade,
  user_id    uuid   not null default auth.uid() references auth.users(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  review     text check (char_length(review) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (movie_id, user_id)
);

create table public.meals (
  id         bigint generated always as identity primary key,
  title      text not null check (char_length(title) between 1 and 120),
  cooked_on  date not null,
  recipe     text check (char_length(recipe) <= 10000),
  created_at timestamptz not null default now()
);
```

**Políticas RLS:**

```sql
-- outings, movies, meals: los dos ven y editan todo
alter table public.outings enable row level security;
revoke all on public.outings from anon;
grant select, insert, update, delete on public.outings to authenticated;
create policy couple_all on public.outings for all to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'couple') = 'true')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'couple') = 'true');
-- (idéntico para movies y meals)

-- movie_reviews: los dos ven ambas; cada uno escribe solo la suya
alter table public.movie_reviews enable row level security;
revoke all on public.movie_reviews from anon;
grant select, insert, update, delete on public.movie_reviews to authenticated;

create policy reviews_read on public.movie_reviews for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'couple') = 'true');

create policy reviews_write on public.movie_reviews for all to authenticated
  using      ((select auth.jwt() -> 'app_metadata' ->> 'couple') = 'true'
              and user_id = (select auth.uid()))
  with check ((select auth.jwt() -> 'app_metadata' ->> 'couple') = 'true'
              and user_id = (select auth.uid()));
```

```sql
-- Después de crear las cuentas
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"couple": true, "name": "Bastián"}' where email = 'basti2001.bc@gmail.com';
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"couple": true, "name": "Beatriz"}' where email = 'beapenas18@gmail.com';
-- Luego: select id, email, raw_app_meta_data from auth.users;  → UUIDs para lib/couple.ts
```

> [!NOTE]
> - `(select auth.uid())` y `(select auth.jwt())` se evalúan una vez por query (initPlan) y no una vez por fila.
> - La PK `(movie_id, user_id)` ya indexa el join con `movies`, así que no hacen falta más índices.
> - El "guardar mi reseña" es un `upsert` sobre la PK. Necesita los permisos insert, update y select, que ya están otorgados.

> [!IMPORTANT]
> La metadata entra al JWT recién cuando se refresca el token, así que cada uno debe cerrar sesión y volver a entrar una vez después del `update`.

### 3.3 Cierre de la fase
`get_advisors` (security y performance), luego `generate_typescript_types` → `lib/database.types.ts`.

---

## 4. Estructura

```
app/
  _layout.tsx          # fuentes, splash, QueryClient persistido, guard de sesión
  login.tsx
  (tabs)/
    _layout.tsx        # 4 tabs
    index.tsx          # Inicio: cuenta regresiva / días juntos
    outings.tsx
    movies.tsx         # Vistas | Wishlist
    meals.tsx
  movie/[id].tsx       # Detalle: reseña de Bastián + reseña de Beatriz, editar la mía
  meal/[id].tsx        # Detalle con receta
  form.tsx             # Modal único: ?type=outing|movie|meal  [&id=N → modo edición]
lib/
  supabase.ts  query.ts  db.ts  dates.ts  couple.ts  theme.ts  database.types.ts
components/
  Card  Button  Input  DateField  Hearts  EmptyState
```

- **Modal de formulario único:** si recibe `id`, precarga los datos desde el caché (sin request extra) y hace `update`; si no, hace `insert`. Así la edición sale casi gratis.
- **`lib/db.ts`:** contiene `useList`, `useItem` y `useMutate`, genéricos para las 4 tablas.

---

## 5. Optimización de datos y recursos

| Técnica | Detalle |
|---|---|
| **TanStack Query** | Keys `['outings']`, `['movies']`, `['meals']`, `['meal', id]`. `staleTime` de 5 minutos |
| **Caché persistido en SQLite** | Usa el mismo `localStorage` que la sesión, con `maxAge` y `gcTime` de 7 días. Arranque instantáneo y lectura offline |
| **Películas + reseñas en 1 request** | `select('id,title,watched_on,movie_reviews(user_id,rating,review)')` usa el embed de PostgREST. La lista y el detalle comparten ese caché, así que el detalle no hace ningún request |
| **Columnas explícitas** | La lista de comidas no trae `recipe`; el detalle sí, usando la lista como `placeholderData` |
| **Invalidación precisa** | Cada mutación invalida solo su key. Las reseñas invalidan `['movies']` |
| **Refetch al volver a la app** | `focusManager` + `AppState` y pull-to-refresh. Sin Realtime |
| **Auth auto-refresh atado a AppState** | Se pausa en background: sin timers ni red |
| **Inicio sin red** | Fecha constante `2026-11-20` en `lib/dates.ts` |
| **Listas** | `FlatList` con filas memoizadas |
| **Logout** | `queryClient.clear()` y se borra el caché persistido |

**Descartado:** Realtime, paginación y updates optimistas. Con dos personas y pocos datos no aportan.

---

## 6. Diseño

```ts
export const colors = {
  bg: '#FFF7F6', card: '#FFFFFF', primary: '#F08A8B', primarySoft: '#FDE4E3',
  text: '#3B2A2A', muted: '#9C8585', border: '#F4DCDB', danger: '#D9534F',
};
export const radius = { card: 20, input: 14, pill: 999 };
export const font = { regular: 'Inter_400Regular', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' };
```

- Tarjetas blancas con radio de 20, borde de 1px, `elevation` suave (Android) y padding de 16.
- FAB "+" redondo en cada lista y botones tipo *pill*.
- Cada tarjeta tiene un ícono de lápiz para **Editar**. Mantener presionado abre la opción **Borrar** con confirmación.
- En películas vistas: corazones promedio en la lista y, en el detalle, dos bloques: "Bastián ♥♥♥♥♡" y "Beatriz ♥♥♥♥♥".
- La barra de estado y el fondo del splash van en `bg`, y el ícono adaptativo de Android usa `primary`.

---

## 7. Fases

### Fase 0: Supabase (vía MCP, proyecto `byb`)
1. Aplicar el esquema y las políticas de §3.2.
2. ✅ Cuentas creadas: `basti2001.bc@gmail.com` (Bastián) y `beapenas18@gmail.com` (Beatriz). **Tú:** confirmar que *Allow new users to sign up* esté desactivado.
3. Ejecutar los `update` de metadata, leer los UUIDs para `lib/couple.ts` y correr `get_advisors`.
4. Generar los tipos TS.

### Fase 1: Scaffold
1. `npx create-expo-app@latest .` → `npm run reset-project`.
2. Instalar los paquetes de §2.
3. `app.json`: `name: "byb"`, `android.package: "com.bastian.byb"`, ícono adaptativo, colores del splash.
4. `.env` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (**nunca** la `service_role`), y `.env` en `.gitignore`.
5. `theme.ts` y carga de Inter con el splash.

### Fase 2: Auth
- `lib/supabase.ts` (storage `localStorage`, `detectSessionInUrl: false`, auto-refresh atado a AppState).
- `login.tsx` con email y contraseña, sin registro.
- Guard con `onAuthStateChange` y `Stack.Protected`. Saludo "Hola, Bastián" y botón de cerrar sesión en Inicio.

### Fase 3: Capa de datos
`lib/query.ts` y `lib/db.ts`.

### Fase 4: Pantallas
| Pantalla | Funcionalidad |
|---|---|
| **Inicio** | Con `diff = días entre hoy y 2026-11-20` (fechas locales a medianoche, `Math.round` para absorber cambios de horario): si `diff < 0`, muestra "Faltan \|diff\| días"; si no, "**diff + 1** días juntos". El 20-11-2026 es el **día 1** |
| **Salidas** | Lista por `happened_on desc`. Agregar, editar y borrar |
| **Películas** | Tabs Vistas / Wishlist. Agregar, editar y borrar. Desde la wishlist, "Marcar como vista" pide la fecha. En el detalle, cada uno edita su propia reseña (1–5 y opinión) y ve la del otro |
| **Cocina** | Lista por `cooked_on desc`. El detalle muestra la receta. Agregar, editar y borrar |

### Fase 5: APK con EAS
1. `npm i -g eas-cli` → `eas login` → `eas build:configure`.
2. En `eas.json`, perfil `preview` con `"android": { "buildType": "apk" }` y `"distribution": "internal"`.
3. Variables de entorno en EAS: `eas env:create --environment preview` para las dos `EXPO_PUBLIC_*`. El `.env` no se sube, porque está en `.gitignore`.
4. `eas build -p android --profile preview` → link de descarga del APK.

### Fase 6: Verificación
- `npx tsc --noEmit` y `npx expo-doctor`.
- En Expo Go con las 2 cuentas:
  - lo que agrega una se ve en la otra al volver a la app;
  - cada uno puede editar solo su reseña.
- RLS por SQL, simulando cada usuario:
  - una cuenta sin `couple` no ve nada;
  - Beatriz no puede modificar la reseña de Bastián.
- Modo avión: las listas se ven desde el caché.
- Instalar el APK en un Android real.

> [!WARNING]
> Las fechas `date` (`'YYYY-MM-DD'`) se parsean por partes en `lib/dates.ts`. `new Date('2026-11-20')` las toma como UTC y en Chile mostraría el día 19.

---

## 8. Estado
- ✅ Todas las decisiones están cerradas: el 20-11 cuenta como día 1 y las cuentas ya están creadas.
- ⏳ Falta tu aprobación para empezar por la Fase 0.
