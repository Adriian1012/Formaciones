import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { Home, Users, Building2, GraduationCap, Calendar, BarChart3, Settings, LogOut, Menu, X, ChevronRight, Plus, Search, Filter, Edit, Trash2, Check, Clock, TrendingUp, User } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ============== AUTH PROVIDER ==============
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============== COMPONENTS ==============

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const navItems = [
    { icon: Home, label: "Inicio", path: "/" },
    { icon: Building2, label: "Salones", path: "/salones" },
    { icon: Users, label: "Empleados", path: "/empleados" },
    { icon: GraduationCap, label: "Formación", path: "/formaciones" },
    { icon: Calendar, label: "Agenda", path: "/agenda" },
  ];

  if (user?.role === "admin") {
    navItems.push({ icon: Settings, label: "Admin", path: "/admin" });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border z-50 md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all ${
                isActive ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Building2, label: "Salones", path: "/salones" },
    { icon: Users, label: "Empleados", path: "/empleados" },
    { icon: GraduationCap, label: "Formaciones", path: "/formaciones" },
    { icon: Calendar, label: "Agenda", path: "/agenda" },
    { icon: BarChart3, label: "Reportes", path: "/reportes" },
  ];

  if (user?.role === "admin") {
    navItems.push({ icon: Settings, label: "Administración", path: "/admin" });
  }

  return (
    <aside className={`hidden md:flex flex-col bg-card border-r border-border h-screen sticky top-0 transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <h1 className="font-heading text-lg font-bold text-emerald-500 uppercase tracking-tight">Formaciones Versus</h1>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-2 hover:bg-accent rounded-lg">
          {collapsed ? <ChevronRight size={20} /> : <Menu size={20} />}
        </button>
      </div>
      
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <button
              type="button"
              key={item.path}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(item.path); }}
              data-testid={`sidebar-${item.path.replace('/', '') || 'home'}`}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all cursor-pointer select-none ${
                isActive ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon size={20} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border">
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground">
              {user?.role === "admin" ? "Administrador" : user?.role === "supervisor" ? "Supervisor" : "Coordinador"}
            </p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut size={20} />
          {!collapsed && <span className="font-medium">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold uppercase tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, color = "emerald", onClick }) {
  const colors = {
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/30",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    slate: "text-slate-400 bg-slate-500/10 border-slate-500/30",
  };

  return (
    <div 
      className={`bg-card border border-border rounded-lg p-5 hover:border-emerald-500/50 transition-all ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className="flex items-center text-xs text-emerald-500">
            <TrendingUp size={14} className="mr-1" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-heading font-bold mt-4">{value}</p>
      <p className="text-sm text-muted-foreground mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 bg-accent rounded-full mb-4">
        <Icon size={32} className="text-muted-foreground" />
      </div>
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-md max-h-[90vh] overflow-auto shadow-xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Button({ children, variant = "primary", size = "md", className = "", ...props }) {
  const variants = {
    primary: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-border bg-transparent hover:bg-accent",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    ghost: "hover:bg-accent",
  };
  
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-12 px-6",
    lg: "h-14 px-8 text-lg",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Input({ label, error, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{label}</label>}
      <input
        className="w-full h-12 px-4 bg-background border border-input rounded-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
        {...props}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}

function Select({ label, options, error, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{label}</label>}
      <select
        className="w-full h-12 px-4 bg-background border border-input rounded-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}

function Textarea({ label, error, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{label}</label>}
      <textarea
        className="w-full p-4 bg-background border border-input rounded-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none resize-none"
        rows={3}
        {...props}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}

function Badge({ children, variant = "default" }) {
  const variants = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-emerald-500/20 text-emerald-500",
    warning: "bg-amber-500/20 text-amber-500",
    info: "bg-blue-500/20 text-blue-500",
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

function LevelBadge({ level }) {
  const variants = {
    Principiante: "warning",
    Intermedio: "info",
    Avanzado: "success",
  };
  return <Badge variant={variants[level] || "default"}>{level}</Badge>;
}

// ============== PAGES ==============

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Cargar credenciales guardadas al iniciar
  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    const savedPassword = localStorage.getItem("remembered_password");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        // Guardar o eliminar credenciales según checkbox
        if (rememberMe) {
          localStorage.setItem("remembered_email", email);
          localStorage.setItem("remembered_password", password);
        } else {
          localStorage.removeItem("remembered_email");
          localStorage.removeItem("remembered_password");
        }
      } else {
        await register(name, email, password);
      }
      toast.success(isLogin ? "¡Bienvenido!" : "¡Registro exitoso!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1704162634298-b9d3f5ca0c08?crop=entropy&cs=srgb&fm=jpg&q=85')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/70" />
      
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-bold text-emerald-500 uppercase tracking-tight">Formaciones Versus</h1>
          <p className="text-muted-foreground mt-2">Sistema de Gestión de Formación</p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-lg p-6">
          <div className="flex mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-center font-medium rounded-l-sm transition-all ${
                isLogin ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-center font-medium rounded-r-sm transition-all ${
                !isLogin ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                label="Nombre"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                required
                data-testid="register-name"
              />
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              data-testid="login-email"
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              data-testid="login-password"
            />
            {isLogin && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-input bg-background"
                  data-testid="remember-me"
                />
                <span className="text-sm text-muted-foreground">Recordar usuario y contraseña</span>
              </label>
            )}
            <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit">
              {loading ? "Procesando..." : isLogin ? "Entrar" : "Crear Cuenta"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, upcomingRes] = await Promise.all([
          api.get("/stats"),
          api.get("/scheduled-trainings?upcoming_only=true")
        ]);
        setStats(statsRes.data);
        setUpcoming(upcomingRes.data.slice(0, 5));
      } catch (err) {
        toast.error("Error al cargar datos");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>;
  }

  return (
    <div data-testid="dashboard" className="space-y-6">
      <PageHeader 
        title={`Hola, ${user?.name?.split(" ")[0]}`}
        subtitle={new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Empleados" value={stats?.total_employees || 0} color="emerald" onClick={() => navigate("/empleados")} />
        <StatCard icon={GraduationCap} label="Formaciones" value={stats?.total_trainings || 0} color="blue" onClick={() => navigate("/formaciones")} />
        <StatCard icon={Calendar} label="Este Mes" value={stats?.trainings_this_month || 0} color="amber" onClick={() => navigate("/reportes")} />
        <StatCard icon={Clock} label="Programadas" value={stats?.upcoming_trainings || 0} color="slate" onClick={() => navigate("/agenda")} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-heading text-lg font-semibold mb-4 uppercase tracking-tight">Empleados por Nivel</h2>
          <div className="space-y-3">
            {["Principiante", "Intermedio", "Avanzado"].map((level) => {
              const count = stats?.employees_by_level?.[level] || 0;
              const total = stats?.total_employees || 1;
              const percent = Math.round((count / total) * 100);
              const colors = {
                Principiante: "bg-amber-500",
                Intermedio: "bg-blue-500",
                Avanzado: "bg-emerald-500",
              };
              return (
                <div key={level}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{level}</span>
                    <span className="text-muted-foreground">{count} ({percent}%)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${colors[level]} transition-all`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-heading text-lg font-semibold mb-4 uppercase tracking-tight">Próximas Formaciones</h2>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay formaciones programadas</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Calendar size={16} className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{item.training_type_name}</p>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(item.scheduled_date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SalonesPage() {
  const { user } = useAuth();
  const [salones, setSalones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSalon, setEditingSalon] = useState(null);
  const [formData, setFormData] = useState({ name: "", address: "", city: "Murcia" });
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const navigate = useNavigate();

  const fetchSalones = async () => {
    try {
      const { data } = await api.get("/salons");
      setSalones(data);
    } catch (err) {
      toast.error("Error al cargar salones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSalones(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSalon) {
        await api.put(`/salons/${editingSalon.id}`, formData);
        toast.success("Salón actualizado");
      } else {
        await api.post("/salons", formData);
        toast.success("Salón creado");
      }
      setModalOpen(false);
      setEditingSalon(null);
      setFormData({ name: "", address: "", city: "Murcia" });
      fetchSalones();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este salón?")) return;
    try {
      await api.delete(`/salons/${id}`);
      toast.success("Salón eliminado");
      fetchSalones();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
  };

  const openEdit = (salon) => {
    setEditingSalon(salon);
    setFormData({ name: salon.name, address: salon.address, city: salon.city });
    setModalOpen(true);
  };

  const filteredSalones = salones.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.address?.toLowerCase().includes(search.toLowerCase()) ||
      s.city?.toLowerCase().includes(search.toLowerCase());
    
    // Si onlyMine está activo y el admin tiene salones asignados, filtrar
    const matchMine = !onlyMine || !user?.assigned_salons?.length || user.assigned_salons.includes(s.id);
    
    return matchSearch && matchMine;
  });

  return (
    <div data-testid="salones-page">
      <PageHeader
        title="Salones"
        subtitle={`${filteredSalones.length} de ${salones.length} salones`}
        action={user?.role === "admin" && (
          <Button onClick={() => { setEditingSalon(null); setFormData({ name: "", address: "", city: "Murcia" }); setModalOpen(true); }} data-testid="add-salon-btn">
            <Plus size={20} /> Nuevo Salón
          </Button>
        )}
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar salón por nombre, dirección o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 bg-background border border-input rounded-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            data-testid="search-salones"
          />
        </div>
        
        {user?.role === "admin" && user?.assigned_salons?.length > 0 && (
          <label className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-sm cursor-pointer hover:border-emerald-500/50 transition-all select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
              className="w-5 h-5 rounded border-input accent-emerald-500"
              data-testid="only-mine-toggle"
            />
            <span className="text-sm font-medium">Solo mis salones ({user.assigned_salons.length})</span>
          </label>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
      ) : filteredSalones.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search ? "Sin resultados" : "Sin salones"}
          description={search ? "No se encontraron salones con esa búsqueda" : "Aún no hay salones registrados"}
          action={!search && user?.role === "admin" && <Button onClick={() => setModalOpen(true)}><Plus size={20} /> Crear Salón</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSalones.map((salon) => (
            <div
              key={salon.id}
              className="bg-card border border-border rounded-lg p-5 hover:border-emerald-500/50 transition-all cursor-pointer group"
              onClick={() => navigate(`/salones/${salon.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Building2 size={20} className="text-emerald-500" />
                </div>
                {user?.role === "admin" && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(salon); }} className="p-2 hover:bg-accent rounded-lg" data-testid={`edit-salon-${salon.id}`}>
                      <Edit size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(salon.id); }} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg" data-testid={`delete-salon-${salon.id}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="font-heading text-lg font-semibold mt-4">{salon.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{salon.address || "Sin dirección"}</p>
              <p className="text-xs text-muted-foreground mt-1">{salon.city}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingSalon ? "Editar Salón" : "Nuevo Salón"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required data-testid="salon-name" />
          <Input label="Dirección" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} data-testid="salon-address" />
          <Input label="Ciudad" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} data-testid="salon-city" />
          <Button type="submit" className="w-full" data-testid="salon-submit">{editingSalon ? "Actualizar" : "Crear"}</Button>
        </form>
      </Modal>
    </div>
  );
}

function SalonDetailPage() {
  const { id } = useParams();
  const [salon, setSalon] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salonRes, empRes] = await Promise.all([
          api.get(`/salons/${id}`),
          api.get(`/employees?salon_id=${id}`)
        ]);
        setSalon(salonRes.data);
        setEmployees(empRes.data);
      } catch (err) {
        toast.error("Error al cargar datos");
        navigate("/salones");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>;

  return (
    <div data-testid="salon-detail">
      <PageHeader
        title={salon?.name}
        subtitle={`${salon?.address || "Sin dirección"} - ${salon?.city}`}
        action={<Button variant="outline" onClick={() => navigate("/salones")}><ChevronRight size={20} className="rotate-180" /> Volver</Button>}
      />

      <h2 className="font-heading text-xl font-semibold mb-4 uppercase tracking-tight">Empleados ({employees.length})</h2>
      
      {employees.length === 0 ? (
        <EmptyState icon={Users} title="Sin empleados" description="Este salón no tiene empleados registrados" />
      ) : (
        <div className="grid gap-3">
          {employees.map((emp) => (
            <div key={emp.id} onClick={() => navigate(`/empleados/${emp.id}`)} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 hover:border-emerald-500/50 transition-all cursor-pointer">
              <div className="p-2 bg-secondary rounded-full">
                <User size={20} />
              </div>
              <div className="flex-1">
                <p className="font-medium">{emp.name}</p>
                <p className="text-sm text-muted-foreground">{emp.trainings_count} formaciones</p>
              </div>
              <LevelBadge level={emp.level} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmpleadosPage() {
  const [employees, setEmployees] = useState([]);
  const [salones, setSalones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: "", salon_id: "", level: "Principiante", notes: "" });
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [empRes, salonRes] = await Promise.all([
        api.get("/employees"),
        api.get("/salons")
      ]);
      setEmployees(empRes.data);
      setSalones(salonRes.data);
    } catch (err) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/employees/${editing.id}`, formData);
        toast.success("Empleado actualizado");
      } else {
        await api.post("/employees", formData);
        toast.success("Empleado creado");
      }
      setModalOpen(false);
      setEditing(null);
      setFormData({ name: "", salon_id: "", level: "Principiante", notes: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este empleado?")) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success("Empleado eliminado");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchSearch = emp.name.toLowerCase().includes(search.toLowerCase());
    const matchLevel = !filterLevel || emp.level === filterLevel;
    return matchSearch && matchLevel;
  });

  return (
    <div data-testid="empleados-page">
      <PageHeader
        title="Empleados"
        subtitle={`${employees.length} empleados registrados`}
        action={
          <Button onClick={() => { setEditing(null); setFormData({ name: "", salon_id: salones[0]?.id || "", level: "Principiante", notes: "" }); setModalOpen(true); }} data-testid="add-employee-btn">
            <Plus size={20} /> Nuevo Empleado
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar empleado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 bg-background border border-input rounded-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            data-testid="search-employees"
          />
        </div>
        <Select
          options={[{ value: "", label: "Todos los niveles" }, { value: "Principiante", label: "Principiante" }, { value: "Intermedio", label: "Intermedio" }, { value: "Avanzado", label: "Avanzado" }]}
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="w-full sm:w-48"
          data-testid="filter-level"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
      ) : filteredEmployees.length === 0 ? (
        <EmptyState icon={Users} title="Sin resultados" description="No se encontraron empleados" />
      ) : (
        <div className="grid gap-3">
          {filteredEmployees.map((emp) => (
            <div key={emp.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 hover:border-emerald-500/50 transition-all group">
              <div className="p-2 bg-secondary rounded-full cursor-pointer" onClick={() => navigate(`/empleados/${emp.id}`)}>
                <User size={20} />
              </div>
              <div className="flex-1 cursor-pointer" onClick={() => navigate(`/empleados/${emp.id}`)}>
                <p className="font-medium">{emp.name}</p>
                <p className="text-sm text-muted-foreground">{emp.salon_name} · {emp.trainings_count} formaciones</p>
              </div>
              <LevelBadge level={emp.level} />
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditing(emp); setFormData({ name: emp.name, salon_id: emp.salon_id, level: emp.level, notes: emp.notes }); setModalOpen(true); }} className="p-2 hover:bg-accent rounded-lg" data-testid={`edit-emp-${emp.id}`}>
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(emp.id)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg" data-testid={`delete-emp-${emp.id}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Empleado" : "Nuevo Empleado"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required data-testid="emp-name" />
          <Select
            label="Salón"
            options={salones.map((s) => ({ value: s.id, label: s.name }))}
            value={formData.salon_id}
            onChange={(e) => setFormData({ ...formData, salon_id: e.target.value })}
            required
            data-testid="emp-salon"
          />
          <Select
            label="Nivel"
            options={[{ value: "Principiante", label: "Principiante" }, { value: "Intermedio", label: "Intermedio" }, { value: "Avanzado", label: "Avanzado" }]}
            value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
            data-testid="emp-level"
          />
          <Textarea label="Notas" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} data-testid="emp-notes" />
          <Button type="submit" className="w-full" data-testid="emp-submit">{editing ? "Actualizar" : "Crear"}</Button>
        </form>
      </Modal>
    </div>
  );
}

function EmpleadoDetailPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, histRes] = await Promise.all([
          api.get(`/employees/${id}`),
          api.get(`/trainings/employee/${id}/history`)
        ]);
        setEmployee(empRes.data);
        setHistory(histRes.data);
      } catch (err) {
        toast.error("Error al cargar datos");
        navigate("/empleados");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>;

  return (
    <div data-testid="employee-detail">
      <PageHeader
        title={employee?.name}
        subtitle={employee?.salon_name}
        action={<Button variant="outline" onClick={() => navigate("/empleados")}><ChevronRight size={20} className="rotate-180" /> Volver</Button>}
      />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={GraduationCap} label="Formaciones" value={employee?.trainings_count || 0} color="emerald" />
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground uppercase tracking-wider">Nivel Actual</p>
          <div className="mt-2"><LevelBadge level={employee?.level} /></div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground uppercase tracking-wider">Notas</p>
          <p className="mt-2 text-sm">{employee?.notes || "Sin notas"}</p>
        </div>
      </div>

      <h2 className="font-heading text-xl font-semibold mb-4 uppercase tracking-tight">Historial de Formaciones</h2>
      
      {history.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Sin historial" description="Este empleado no tiene formaciones registradas" />
      ) : (
        <div className="space-y-3">
          {history.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{t.training_type_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">Por: {t.coordinator_name}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(t.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {t.level_before !== t.level_after && (
                <div className="flex items-center gap-2 mt-2">
                  <LevelBadge level={t.level_before} />
                  <ChevronRight size={16} />
                  <LevelBadge level={t.level_after} />
                </div>
              )}
              {t.notes && <p className="text-sm text-muted-foreground mt-2">{t.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormacionesPage() {
  const [trainings, setTrainings] = useState([]);
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ employee_id: "", training_type_id: "", notes: "", level_after: "" });
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      const [trainRes, typesRes, empRes] = await Promise.all([
        api.get("/trainings"),
        api.get("/training-types"),
        api.get("/employees")
      ]);
      setTrainings(trainRes.data);
      setTrainingTypes(typesRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/trainings", formData);
      toast.success("Formación registrada");
      setModalOpen(false);
      setFormData({ employee_id: "", training_type_id: "", notes: "", level_after: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta formación?")) return;
    try {
      await api.delete(`/trainings/${id}`);
      toast.success("Formación eliminada");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al eliminar");
    }
  };

  return (
    <div data-testid="formaciones-page">
      <PageHeader
        title="Formaciones"
        subtitle={`${trainings.length} formaciones registradas`}
        action={
          <Button onClick={() => { setFormData({ employee_id: employees[0]?.id || "", training_type_id: trainingTypes[0]?.id || "", notes: "", level_after: "" }); setModalOpen(true); }} data-testid="add-training-btn" disabled={trainingTypes.length === 0}>
            <Plus size={20} /> Nueva Formación
          </Button>
        }
      />

      {trainingTypes.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <p className="text-amber-500">No hay tipos de formación creados. El administrador debe crear tipos de formación primero.</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
      ) : trainings.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Sin formaciones" description="Aún no hay formaciones registradas" />
      ) : (
        <div className="space-y-3">
          {trainings.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-lg p-4 hover:border-emerald-500/30 transition-all">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium">{t.employee_name || "Sin nombre"}</p>
                  <p className="text-sm text-emerald-500">{t.training_type_name || "Sin tipo"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {(user?.role === "admin" || t.coordinator_id === user?.id) && (
                    <button 
                      onClick={() => handleDelete(t.id)} 
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-all"
                      title="Eliminar formación"
                      data-testid={`delete-training-${t.id}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>Por: {t.coordinator_name || "Desconocido"}</span>
                {t.level_before !== t.level_after && (
                  <span className="flex items-center gap-1">
                    <LevelBadge level={t.level_before} />
                    <ChevronRight size={14} />
                    <LevelBadge level={t.level_after} />
                  </span>
                )}
              </div>
              {t.notes && <p className="text-sm text-muted-foreground mt-2 border-t border-border pt-2">{t.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Formación">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Empleado"
            options={employees.map((e) => ({ value: e.id, label: `${e.name} (${e.salon_name})` }))}
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
            required
            data-testid="training-employee"
          />
          <Select
            label="Tipo de Formación"
            options={trainingTypes.map((t) => ({ value: t.id, label: t.name }))}
            value={formData.training_type_id}
            onChange={(e) => setFormData({ ...formData, training_type_id: e.target.value })}
            required
            data-testid="training-type"
          />
          <Select
            label="Nuevo Nivel (opcional)"
            options={[{ value: "", label: "Mantener nivel actual" }, { value: "Principiante", label: "Principiante" }, { value: "Intermedio", label: "Intermedio" }, { value: "Avanzado", label: "Avanzado" }]}
            value={formData.level_after}
            onChange={(e) => setFormData({ ...formData, level_after: e.target.value })}
            data-testid="training-level"
          />
          <Textarea label="Notas" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} data-testid="training-notes" />
          <Button type="submit" className="w-full" data-testid="training-submit">Registrar Formación</Button>
        </form>
      </Modal>
    </div>
  );
}

function AgendaPage() {
  const [scheduled, setScheduled] = useState([]);
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ employee_id: "", training_type_id: "", scheduled_date: "", notes: "" });

  const fetchData = async () => {
    try {
      const [schedRes, typesRes, empRes] = await Promise.all([
        api.get("/scheduled-trainings"),
        api.get("/training-types"),
        api.get("/employees")
      ]);
      setScheduled(schedRes.data);
      setTrainingTypes(typesRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/scheduled-trainings", formData);
      toast.success("Formación programada");
      setModalOpen(false);
      setFormData({ employee_id: "", training_type_id: "", scheduled_date: "", notes: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
  };

  const handleComplete = async (id) => {
    try {
      await api.put(`/scheduled-trainings/${id}/complete`);
      toast.success("Marcada como completada");
      fetchData();
    } catch (err) {
      toast.error("Error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Cancelar esta formación programada?")) return;
    try {
      await api.delete(`/scheduled-trainings/${id}`);
      toast.success("Formación cancelada");
      fetchData();
    } catch (err) {
      toast.error("Error");
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div data-testid="agenda-page">
      <PageHeader
        title="Agenda"
        subtitle="Formaciones programadas"
        action={
          <Button onClick={() => { setFormData({ employee_id: employees[0]?.id || "", training_type_id: trainingTypes[0]?.id || "", scheduled_date: "", notes: "" }); setModalOpen(true); }} data-testid="schedule-training-btn" disabled={trainingTypes.length === 0}>
            <Plus size={20} /> Programar
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
      ) : scheduled.length === 0 ? (
        <EmptyState icon={Calendar} title="Sin programaciones" description="No hay formaciones programadas" />
      ) : (
        <div className="space-y-3">
          {scheduled.map((s) => {
            const isPast = s.scheduled_date < today;
            const isToday = s.scheduled_date === today;
            return (
              <div key={s.id} className={`bg-card border rounded-lg p-4 ${s.completed ? "border-emerald-500/30 opacity-60" : isPast ? "border-destructive/30" : isToday ? "border-amber-500/30" : "border-border"}`}>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{s.employee_name}</p>
                      {s.completed && <Badge variant="success">Completada</Badge>}
                      {isToday && !s.completed && <Badge variant="warning">Hoy</Badge>}
                      {isPast && !s.completed && <Badge variant="default">Pendiente</Badge>}
                    </div>
                    <p className="text-sm text-emerald-500">{s.training_type_name}</p>
                    <p className="text-xs text-muted-foreground">{s.salon_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {new Date(s.scheduled_date + "T00:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    {!s.completed && (
                      <button onClick={() => handleComplete(s.id)} className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-lg" title="Marcar completada">
                        <Check size={16} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {s.notes && <p className="text-sm text-muted-foreground mt-2">{s.notes}</p>}
                {s.reminder_sent && <p className="text-xs text-emerald-500 mt-1">Recordatorio enviado</p>}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Programar Formación">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Empleado"
            options={employees.map((e) => ({ value: e.id, label: `${e.name} (${e.salon_name})` }))}
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
            required
            data-testid="schedule-employee"
          />
          <Select
            label="Tipo de Formación"
            options={trainingTypes.map((t) => ({ value: t.id, label: t.name }))}
            value={formData.training_type_id}
            onChange={(e) => setFormData({ ...formData, training_type_id: e.target.value })}
            required
            data-testid="schedule-type"
          />
          <Input
            label="Fecha"
            type="date"
            value={formData.scheduled_date}
            onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
            min={today}
            required
            data-testid="schedule-date"
          />
          <Textarea label="Notas" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} data-testid="schedule-notes" />
          <Button type="submit" className="w-full" data-testid="schedule-submit">Programar</Button>
        </form>
      </Modal>
    </div>
  );
}

function ReportesPage() {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, monthlyRes] = await Promise.all([
          api.get("/stats"),
          api.get("/reports/monthly")
        ]);
        setStats(statsRes.data);
        setMonthlyData(monthlyRes.data);
      } catch (err) {
        toast.error("Error al cargar datos");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>;

  return (
    <div data-testid="reportes-page">
      <PageHeader title="Reportes" subtitle="Estadísticas y análisis" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Empleados" value={stats?.total_employees || 0} color="emerald" />
        <StatCard icon={GraduationCap} label="Total Formaciones" value={stats?.total_trainings || 0} color="blue" />
        <StatCard icon={Calendar} label="Este Mes" value={stats?.trainings_this_month || 0} color="amber" />
        <StatCard icon={Clock} label="Programadas" value={stats?.upcoming_trainings || 0} color="slate" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-heading text-lg font-semibold mb-4 uppercase tracking-tight">Por Tipo de Formación</h2>
          {Object.entries(stats?.trainings_by_type || {}).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats?.trainings_by_type || {}).map(([type, count]) => {
                const total = stats?.total_trainings || 1;
                const percent = Math.round((count / total) * 100);
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{type}</span>
                      <span className="text-muted-foreground">{count} ({percent}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-heading text-lg font-semibold mb-4 uppercase tracking-tight">Este Mes ({monthlyData?.month}/{monthlyData?.year})</h2>
          <p className="text-3xl font-heading font-bold text-emerald-500">{monthlyData?.total_trainings || 0}</p>
          <p className="text-sm text-muted-foreground">formaciones realizadas</p>
          
          {Object.keys(monthlyData?.daily_breakdown || {}).length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium mb-2">Actividad diaria</p>
              <div className="flex gap-1 flex-wrap">
                {Object.entries(monthlyData?.daily_breakdown || {}).slice(-14).map(([day, count]) => (
                  <div key={day} className="flex flex-col items-center" title={`${day}: ${count} formaciones`}>
                    <div className={`w-6 h-6 rounded-sm ${count > 0 ? "bg-emerald-500" : "bg-secondary"}`} style={{ opacity: count > 0 ? Math.min(0.3 + (count * 0.2), 1) : 0.3 }} />
                    <span className="text-[8px] text-muted-foreground">{day.split("-")[2]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminPage() {
  const [activeTab, setActiveTab] = useState("types");
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [salones, setSalones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({ name: "", description: "" });
  const [assignModal, setAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedSalons, setSelectedSalons] = useState([]);
  const { user: currentUser } = useAuth();

  const fetchData = async () => {
    try {
      const [typesRes, usersRes, salonesRes] = await Promise.all([
        api.get("/training-types"),
        api.get("/users"),
        api.get("/salons")
      ]);
      setTrainingTypes(typesRes.data);
      setUsers(usersRes.data);
      setSalones(salonesRes.data);
    } catch (err) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmitType = async (e) => {
    e.preventDefault();
    try {
      if (editingType) {
        await api.put(`/training-types/${editingType.id}`, typeForm);
        toast.success("Tipo actualizado");
      } else {
        await api.post("/training-types", typeForm);
        toast.success("Tipo creado");
      }
      setModalOpen(false);
      setEditingType(null);
      setTypeForm({ name: "", description: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm("¿Eliminar este tipo de formación?")) return;
    try {
      await api.delete(`/training-types/${id}`);
      toast.success("Tipo eliminado");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("¿Eliminar este coordinador?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("Coordinador eliminado");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    }
  };

  const openAssignModal = (user) => {
    setSelectedUser(user);
    setSelectedSalons(user.assigned_salons || []);
    setAssignModal(true);
  };

  const handleAssignSalons = async () => {
    try {
      await api.post("/users/assign-salons", { coordinator_id: selectedUser.id, salon_ids: selectedSalons });
      toast.success("Salones asignados");
      setAssignModal(false);
      fetchData();
    } catch (err) {
      toast.error("Error al asignar salones");
    }
  };

  const toggleSalon = (salonId) => {
    setSelectedSalons(prev => prev.includes(salonId) ? prev.filter(id => id !== salonId) : [...prev, salonId]);
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await api.post("/users/change-role", { user_id: userId, role: newRole });
      toast.success(`Rol cambiado a ${newRole === "supervisor" ? "Supervisor" : "Coordinador"}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al cambiar rol");
    }
  };

  const handleSendReminders = async () => {
    try {
      const { data } = await api.post("/send-reminders");
      toast.success(data.message);
    } catch (err) {
      toast.error("Error al enviar recordatorios");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>;

  return (
    <div data-testid="admin-page">
      <PageHeader title="Administración" subtitle="Gestión del sistema" />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: "types", label: "Tipos de Formación", icon: GraduationCap },
          { id: "users", label: "Coordinadores", icon: Users },
          { id: "tools", label: "Herramientas", icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "types" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditingType(null); setTypeForm({ name: "", description: "" }); setModalOpen(true); }} data-testid="add-type-btn">
              <Plus size={20} /> Nuevo Tipo
            </Button>
          </div>

          {trainingTypes.length === 0 ? (
            <EmptyState icon={GraduationCap} title="Sin tipos" description="Crea tipos de formación para empezar" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {trainingTypes.map((type) => (
                <div key={type.id} className="bg-card border border-border rounded-lg p-4 group hover:border-emerald-500/50 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <GraduationCap size={20} className="text-emerald-500" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingType(type); setTypeForm({ name: type.name, description: type.description }); setModalOpen(true); }} className="p-2 hover:bg-accent rounded-lg">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteType(type.id)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-medium mt-3">{type.name}</h3>
                  {type.description && <p className="text-sm text-muted-foreground mt-1">{type.description}</p>}
                </div>
              ))}
            </div>
          )}

          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingType ? "Editar Tipo" : "Nuevo Tipo de Formación"}>
            <form onSubmit={handleSubmitType} className="space-y-4">
              <Input label="Nombre" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} required placeholder="Ej: Terminales" data-testid="type-name" />
              <Textarea label="Descripción" value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} placeholder="Descripción opcional" data-testid="type-description" />
              <Button type="submit" className="w-full" data-testid="type-submit">{editingType ? "Actualizar" : "Crear"}</Button>
            </form>
          </Modal>
        </div>
      )}

      {activeTab === "users" && (
        <div>
          {users.filter(u => u.role !== "admin").length === 0 ? (
            <EmptyState icon={Users} title="Sin usuarios" description="Los coordinadores pueden registrarse desde la pantalla de login" />
          ) : (
            <div className="space-y-3">
              {users.filter(u => u.role !== "admin" || u.id === currentUser.id).map((user) => (
                <div key={user.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 flex-wrap">
                  <div className="p-2 bg-secondary rounded-full">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{user.name}</p>
                      <Badge variant={user.role === "admin" ? "success" : user.role === "supervisor" ? "info" : "default"}>
                        {user.role === "admin" ? "Admin" : user.role === "supervisor" ? "Supervisor" : "Coordinador"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    {user.role === "coordinator" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {user.assigned_salons?.length || 0} salones asignados
                      </p>
                    )}
                    {user.role === "supervisor" && (
                      <p className="text-xs text-blue-500 mt-1">
                        Ve todas las salas y empleados
                      </p>
                    )}
                  </div>
                  {user.role !== "admin" && (
                    <div className="flex gap-2 flex-wrap">
                      <Select
                        options={[
                          { value: "coordinator", label: "Coordinador" },
                          { value: "supervisor", label: "Supervisor" }
                        ]}
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        className="w-32"
                      />
                      {user.role === "coordinator" && (
                        <Button variant="outline" size="sm" onClick={() => openAssignModal(user)}>
                          <Building2 size={16} /> Asignar
                        </Button>
                      )}
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Modal open={assignModal} onClose={() => setAssignModal(false)} title={`Asignar Salones a ${selectedUser?.name}`}>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {salones.map((salon) => (
                <label key={salon.id} className="flex items-center gap-3 p-3 bg-background rounded-lg cursor-pointer hover:bg-accent transition-all">
                  <input
                    type="checkbox"
                    checked={selectedSalons.includes(salon.id)}
                    onChange={() => toggleSalon(salon.id)}
                    className="w-5 h-5 rounded border-input"
                  />
                  <span>{salon.name}</span>
                </label>
              ))}
            </div>
            <Button onClick={handleAssignSalons} className="w-full mt-4">Guardar Asignación</Button>
          </Modal>
        </div>
      )}

      {activeTab === "tools" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-heading text-lg font-semibold mb-2">Mis Salones Asignados</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona los salones que coordinas directamente. Esto te permitirá filtrarlos rápidamente.
              <br />
              <span className="text-emerald-500">Actualmente tienes {currentUser?.assigned_salons?.length || 0} salones asignados.</span>
            </p>
            <Button onClick={() => { setSelectedUser(currentUser); setSelectedSalons(currentUser?.assigned_salons || []); setAssignModal(true); }} data-testid="assign-my-salons-btn">
              <Building2 size={20} /> Configurar Mis Salones
            </Button>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-heading text-lg font-semibold mb-2">Enviar Recordatorios</h3>
            <p className="text-sm text-muted-foreground mb-4">Envía recordatorios por email para las formaciones programadas para mañana.</p>
            <Button onClick={handleSendReminders} data-testid="send-reminders-btn">
              <Clock size={20} /> Enviar Recordatorios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== ROUTING ==============

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

// Import useParams at top
import { useParams } from "react-router-dom";

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
          <Route path="/salones" element={<ProtectedRoute><Layout><SalonesPage /></Layout></ProtectedRoute>} />
          <Route path="/salones/:id" element={<ProtectedRoute><Layout><SalonDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/empleados" element={<ProtectedRoute><Layout><EmpleadosPage /></Layout></ProtectedRoute>} />
          <Route path="/empleados/:id" element={<ProtectedRoute><Layout><EmpleadoDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/formaciones" element={<ProtectedRoute><Layout><FormacionesPage /></Layout></ProtectedRoute>} />
          <Route path="/agenda" element={<ProtectedRoute><Layout><AgendaPage /></Layout></ProtectedRoute>} />
          <Route path="/reportes" element={<ProtectedRoute><Layout><ReportesPage /></Layout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Layout><AdminPage /></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
