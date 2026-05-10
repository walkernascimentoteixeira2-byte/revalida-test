/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame,
  Award,
  Store,
  BookOpen,
  History, 
  Play, 
  Search, 
  ChevronLeft, 
  Trophy, 
  Dna, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Zap, 
  SkipForward, 
  Eraser, 
  ShieldCheck,
  RotateCcw,
  Clock,
  LayoutDashboard,
  BarChart3,
  Filter,
  MessageSquare,
  Edit,
  Trash2,
  Check,
  Settings,
  AlertTriangle,
  Target,
  ZapOff,
  Crosshair,
  Crown,
  Flashlight,
  Compass,
  Gift,
  Dice5,
  Dna as DnaIcon,
  Sword,
  ShieldAlert,
  Ghost,
  Lock,
  Zap as ZapIcon,
  Scale,
  Bell,
  Star,
  Sparkles,
  Mail,
  Inbox,
  LogOut,
  UserCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question, Difficulty, TestResult, AppState, CategoryStats, ErrorLogEntry, Medal, Mission, MedicalCard as MedCard, SkillNode, Contestation, AppNotification, MailItem } from './types';
import { loadState, saveState, addTestToHistory, calculateLevel, updateActivityStreak, checkMedals, findNewMedals, getXPMultiplier, getTitle } from './lib/storage';
import { generateQuestions, generateSimilarQuestions, analyzeContestation } from './lib/gemini';
import { triggerHaptic } from './lib/haptic';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';

// --- Components ---

const PointsBadge = ({ points }: { points: number }) => (
  <div className="flex items-center gap-2 bg-natural-50 text-natural-muted px-4 py-2 rounded-full border border-natural-200 font-bold text-sm shadow-sm font-mono whitespace-nowrap">
    <Trophy size={16} className="text-natural-600" />
    {points} pts
  </div>
);

function CategoryProgressBar({ label, correct, total }: { label: string; correct: number; total: number; key?: any }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  let barColor = "bg-rose-500";
  if (pct >= 60) barColor = "bg-emerald-500";
  else if (pct >= 50) barColor = "bg-amber-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-base font-black text-natural-muted uppercase tracking-tighter">
        <span>{label}</span>
        <span>{total > 0 ? `${pct}% (${correct}/${total})` : 'SEM QUESTÕES'}</span>
      </div>
      <div className="h-1.5 w-full bg-natural-100 rounded-full border border-natural-200/50 overflow-hidden">
        {total > 0 ? (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            className={`h-full ${barColor} shadow-[0_0_5px_rgba(0,0,0,0.1)]`}
          />
        ) : null}
      </div>
    </div>
  );
}

function CategoryStatsGrid({ stats }: { stats: CategoryStats[] }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {stats.map((s, idx) => (
        <CategoryProgressBar 
          key={idx}
          label={s.category}
          correct={s.correct}
          total={s.total}
        />
      ))}
    </div>
  );
}

const Navbar = ({ points, onGoHome, onSettings, onViewMailbox, unreadMailCount, user, onLogout }: { 
  points: number; 
  onGoHome: () => void; 
  onSettings: () => void; 
  onViewMailbox: () => void; 
  unreadMailCount: number;
  user: FirebaseUser | null;
  onLogout: () => void;
}) => (
  <header className="sticky top-0 z-50 bg-white border-b border-natural-200 px-6 py-4 flex items-center justify-between shadow-sm">
    <div className="flex items-center gap-4 cursor-pointer" onClick={onGoHome}>
      <div className="w-10 h-10 bg-natural-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">R</div>
      <h1 className="text-lg font-semibold tracking-tight text-natural-900 hidden sm:block">REVALIDA <span className="text-natural-muted font-light italic">MasterQuiz</span></h1>
    </div>
    <div className="flex items-center gap-4">
      <button 
        onClick={onViewMailbox}
        className="relative p-2 text-natural-400 hover:text-natural-900 transition-colors"
      >
        <Mail size={20} />
        {unreadMailCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[8px] font-black flex items-center justify-center rounded-full border border-white">
            {unreadMailCount}
          </span>
        )}
      </button>
      <button onClick={onSettings} className="p-2 text-natural-400 hover:text-natural-900 transition-colors">
        <Settings size={20} />
      </button>
      <div className="hidden xs:flex items-center gap-2 px-3 py-1 bg-natural-100 rounded-lg text-[10px] uppercase font-bold text-natural-muted tracking-widest border border-natural-200/50">
        Saldo Atual
      </div>
      <PointsBadge points={points} />
      
      {user && (
        <div className="flex items-center gap-3 pl-4 border-l border-natural-100">
          <div className="hidden md:block text-right">
            <p className="text-[10px] font-black uppercase text-natural-900">{user.displayName || 'Médico'}</p>
            <button onClick={onLogout} className="text-[9px] font-bold text-natural-400 hover:text-rose-500 uppercase tracking-widest">Sair</button>
          </div>
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-natural-200" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-natural-100 rounded-full flex items-center justify-center text-natural-400">
              <UserCircle size={20} />
            </div>
          )}
        </div>
      )}
    </div>
  </header>
);

// --- Main App Logic ---

type View = 'HOME' | 'CONFIG' | 'LOADING' | 'QUIZ' | 'RESULT' | 'REVIEW' | 'HISTORY' | 'ERROR_LOG' | 'SHOP' | 'PROFILE' | 'SETTINGS' | 'MISSIONS' | 'SKILLS' | 'COLLECTION' | 'LUCKY_SPIN' | 'CHEFÃO' | 'AUTH';

const MISSIONS_SEED: Omit<Mission, 'progress' | 'completed' | 'deadline'>[] = [
  { id: 'm1', title: 'Plantão do Dia', description: 'Acerte 10 questões de Clínica Médica hoje', type: 'daily', criterion: { type: 'category_target', target: 10, category: 'Clínica Médica' }, reward: { points: 5, xp: 10 } },
  { id: 'm2', title: 'Foco na Criança', description: 'Resolva 30 questões de Pediatria nesta semana', type: 'weekly', criterion: { type: 'category_target', target: 30, category: 'Pediatria' }, reward: { points: 5, xp: 10 } },
  { id: 'm3', title: 'Sem Muletas', description: 'Conclua 1 simulado sem usar facilidades', type: 'daily', criterion: { type: 'simulator_no_facilities', target: 1 }, reward: { points: 5, xp: 10 } },
  { id: 'm4', title: 'Revisor Ágil', description: 'Revise 5 erros do caderno hoje', type: 'daily', criterion: { type: 'revision', target: 5 }, reward: { points: 5, xp: 10 } },
  { id: 'm5', title: 'Cirurgião Preciso', description: 'Acerte 10 questões de Cirurgia hoje', type: 'daily', criterion: { type: 'category_target', target: 10, category: 'Cirurgia' }, reward: { points: 5, xp: 10 } },
  { id: 'm6', title: 'Mestre do Sus', description: 'Acerte 50 questões de Saúde Coletiva na semana', type: 'weekly', criterion: { type: 'category_target', target: 50, category: 'Saúde Coletiva' }, reward: { points: 5, xp: 10 } },
  { id: 'm7', title: 'Obstetra de Plantão', description: 'Acerte 10 questões de GO hoje', type: 'daily', criterion: { type: 'category_target', target: 10, category: 'Ginecologia e Obstetrícia' }, reward: { points: 5, xp: 10 } },
  { id: 'm8', title: 'Maratona de Erros', description: 'Revise 50 questões do caderno de erros na semana', type: 'weekly', criterion: { type: 'revision', target: 50 }, reward: { points: 5, xp: 10 } },
  { id: 'm9', title: 'Especialista em GO', description: 'Acerte 30 questões de GO na semana', type: 'weekly', criterion: { type: 'category_target', target: 30, category: 'Ginecologia e Obstetrícia' }, reward: { points: 5, xp: 10 } },
  { id: 'm10', title: 'Cirurgião da Semana', description: 'Acerte 30 questões de Cirurgia na semana', type: 'weekly', criterion: { type: 'category_target', target: 30, category: 'Cirurgia' }, reward: { points: 5, xp: 10 } },
  { id: 'm11', title: 'Pediatra Dedicado', description: 'Acerte 10 questões de Pediatria hoje', type: 'daily', criterion: { type: 'category_target', target: 10, category: 'Pediatria' }, reward: { points: 5, xp: 10 } },
  { id: 'm12', title: 'Sanitarista do Dia', description: 'Acerte 10 questões de Saúde Coletiva hoje', type: 'daily', criterion: { type: 'category_target', target: 10, category: 'Saúde Coletiva' }, reward: { points: 5, xp: 10 } },
  { id: 'm13', title: 'Doutor em Clínica', description: 'Acerte 50 questões de Clínica Médica na semana', type: 'weekly', criterion: { type: 'category_target', target: 50, category: 'Clínica Médica' }, reward: { points: 5, xp: 10 } },
  { id: 'm14', title: 'Foco no Exame', description: 'Conclua 3 simulados de 50 questões na semana', type: 'weekly', criterion: { type: 'category_target', target: 150, category: 'TODAS' }, reward: { points: 5, xp: 10 } },
];

const MEDICAL_CARDS: MedCard[] = [
  { id: 'c1', title: 'Osvaldo Cruz', description: 'Sanitarista brasileiro, combateu a peste bubônica e a febre amarela.', trivia: 'Liderou a Campanha de Vacinação Obrigatória.', rarity: 'legendary', category: 'História' },
  { id: 'c2', title: 'Critério de Light', description: 'Diferencia exsudato de transudato em derrames pleurais.', trivia: 'Baseia-se em proteínas e LDH.', rarity: 'common', category: 'Clínica Médica' },
  { id: 'c3', title: 'Lei 8.080', description: 'Dispõe sobre as condições para a promoção, proteção e recuperação da saúde.', trivia: 'É a Lei Orgânica do SUS.', rarity: 'epic', category: 'Saúde Coletiva' },
  { id: 'c4', title: 'Sinal de Murphy', description: 'Interrupção da inspiração profunda à palpação do ponto cístico.', trivia: 'Sinal clássico de colecistite aguda.', rarity: 'common', category: 'Cirurgia' },
  { id: 'c5', title: 'Escala de Apgar', description: 'Avaliação rápida do recém-nascido no 1º e 5º minutos.', trivia: 'Avalia cor, FC, irritabilidade, tônus e respiração.', rarity: 'rare', category: 'Pediatria' },
  { id: 'c6', title: 'Regra de Naegele', description: 'Cálculo da data provável do parto (DPP).', trivia: 'Soma-se 7 ao dia e subtrai-se 3 do mês.', rarity: 'common', category: 'Ginecologia e Obstetrícia' },
  { id: 'c7', title: 'Tríade de Virchow', description: 'Fatores que contribuem para a trombose: estase, lesão endotelial e hipercoagulabilidade.', trivia: 'Base para o entendimento do tromboembolismo.', rarity: 'rare', category: 'Clínica Médica' },
  { id: 'c8', title: 'Sinal de Blumberg', description: 'Dor à descompressão súbita no ponto de McBurney.', trivia: 'Sugerido em casos de apendicite aguda.', rarity: 'common', category: 'Cirurgia' },
  { id: 'c9', title: 'Reflexo de Moro', description: 'Reação de susto do recém-nascido ao sentir perda de apoio.', trivia: 'Deve desaparecer por volta dos 3-4 meses.', rarity: 'common', category: 'Pediatria' },
  { id: 'c10', title: 'Papanicolau', description: 'Exame citopatológico para rastreio de câncer de colo de utero.', trivia: 'Fundamental na medicina preventina feminina.', rarity: 'rare', category: 'Ginecologia e Obstetrícia' },
  { id: 'c11', title: 'Carlos Chagas', description: 'Descobriu o ciclo completo da Doença de Chagas.', trivia: 'Único pesquisador indicado ao Nobel por descobrir doença, vetor e patógeno.', rarity: 'legendary', category: 'História' },
  { id: 'c12', title: 'Sinal de Rovsing', description: 'Dor na fossa ilíaca direita ao comprimir a esquerda.', trivia: 'Indica irritação peritoneal.', rarity: 'common', category: 'Cirurgia' },
  { id: 'c13', title: 'Classificação de Child-Pugh', description: 'Avalia o prognóstico da cirrose hepática.', trivia: 'Usa bilirrubina, albumina, TAP, ascite e encefalopatia.', rarity: 'epic', category: 'Clínica Médica' },
  { id: 'c14', title: 'Triângulo de Hesselbach', description: 'Área de fraqueza onde ocorrem as hérnias inguinais diretas.', trivia: 'Delimitado pelo lig. inguinal, vasos epigástricos e reto abdominal.', rarity: 'rare', category: 'Cirurgia' },
  { id: 'c15', title: 'Reflexo de Babinski', description: 'Extensão do hálux ao estimular a planta do pé.', trivia: 'Fisiológico em bebês, patológico em adultos (lesão de neurônio motor superior).', rarity: 'rare', category: 'Clínica Médica' },
  { id: 'c16', title: 'Manobra de Leopold', description: 'Palpação abdominal para determinar a estática fetal.', trivia: 'Composta por quatro tempos distintos.', rarity: 'common', category: 'Ginecologia e Obstetrícia' },
  { id: 'c17', title: 'Escala de Glasgow', description: 'Avalia o nível de consciência após trauma craniano.', trivia: 'Atualizada para incluir reatividade pupilar.', rarity: 'rare', category: 'Clínica Médica' },
  { id: 'c18', title: 'Sinal de Cullen', description: 'Equimose periumbilical.', trivia: 'Pode indicar pancreatite necro-hemorrágica ou gravidez ectópica rota.', rarity: 'epic', category: 'Clínica Médica' },
  { id: 'c19', title: 'Manobra de Heimlich', description: 'Técnica de primeiros socorros para asfixia por corpo estranho.', trivia: 'Compressões abdominais subdiafragmáticas.', rarity: 'rare', category: 'Clínica Médica' },
  { id: 'c20', title: 'Adolfo Lutz', description: 'Pioneiro da epidemiologia e medicina tropical no Brasil.', trivia: 'Identificou a transmissão da febre amarela pelo Aedes aegypti.', rarity: 'legendary', category: 'História' },
  { id: 'c21', title: 'Sinal de Grey-Turner', description: 'Equimose nos flancos.', trivia: 'Sugere hemorragia retroperitoneal.', rarity: 'epic', category: 'Clínica Médica' },
  { id: 'c22', title: 'Classificação de Robson', description: 'Sistema de monitoramento de taxas de cesárea.', trivia: 'Divide as gestantes em 10 grupos baseados em características obstétricas.', rarity: 'rare', category: 'Saúde Coletiva' },
  { id: 'c23', title: 'Regra dos Nove', description: 'Estima a extensão da superfície corporal queimada.', trivia: 'Calcula a porcentagem de área queimada (SCQ).', rarity: 'common', category: 'Cirurgia' },
  { id: 'c24', title: 'Sinal de Babinski', description: 'Extensão dorsal do hálux.', trivia: 'Sinal de comprometimento do trato piramidal.', rarity: 'rare', category: 'Clínica Médica' },
  { id: 'c25', title: 'Florence Nightingale', description: 'Fundadora da enfermagem moderna.', trivia: 'Conhecida como "A Dama da Lâmpada" na Guerra da Crimeia.', rarity: 'legendary', category: 'História' },
  { id: 'c26', title: 'Sinal de Homans', description: 'Dor na panturrilha à dorsiflexão do pé.', trivia: 'Clássico, porém pouco sensível para TVP.', rarity: 'common', category: 'Clínica Médica' },
  { id: 'c27', title: 'Manobra de Ortolani', description: 'Detecta a redução de um quadril luxado no recém-nascido.', trivia: 'Parte do exame físico de rotina no berçário.', rarity: 'epic', category: 'Pediatria' },
  { id: 'c28', title: 'Curva de Gauss', description: 'Distribuição normal utilizada em bioestatística.', trivia: 'Base para definir intervalos de referência laboratoriais.', rarity: 'rare', category: 'Saúde Coletiva' },
  { id: 'c29', title: 'Hipócrates', description: 'O "Pai da Medicina".', trivia: 'Autor do Juramento de Hipócrates.', rarity: 'legendary', category: 'História' },
  { id: 'c30', title: 'Sinal de Jobert', description: 'Desaparecimento da macicez hepática substituída por timpanismo.', trivia: 'Indica pneumoperitônio (perfuração de víscera oca).', rarity: 'epic', category: 'Cirurgia' },
  { id: 'c31', title: 'Escala de Framingham', description: 'Calcula o risco cardiovascular em 10 anos.', trivia: 'Considera idade, sexo, fumo, pressão e colesterol.', rarity: 'rare', category: 'Clínica Médica' },
  { id: 'c32', title: 'Classificação de Mallampati', description: 'Prediz a facilidade de intubação endotraqueal.', trivia: 'Avalia a visibilidade da úvula e palato mole.', rarity: 'rare', category: 'Clínica Médica' },
  { id: 'c33', title: 'Vital Brazil', description: 'Descobriu a especificidade dos soros antiofídicos.', trivia: 'Fundador do Instituto Butantan.', rarity: 'legendary', category: 'História' },
  { id: 'c34', title: 'Sinal de Kernig', description: 'Rigidez da nuca e incapacidade de estender o joelho com a coxa fletida.', trivia: 'Sinal de irritação meníngea.', rarity: 'rare', category: 'Clínica Médica' },
  { id: 'c35', title: 'Manobra de Kristeller', description: 'Pressão no fundo uterino durante o parto (proibida/contraindicada).', trivia: 'Prática obstétrica obsoleta e perigosa.', rarity: 'common', category: 'Ginecologia e Obstetrícia' },
  { id: 'c36', title: 'Lei de Starling', description: 'Força de contração cardíaca proporcional ao estiramento das fibras.', trivia: 'Explica o débito cardíaco baseado no retorno venoso.', rarity: 'rare', category: 'Clínica Médica' },
  { id: 'c37', title: 'Efeito Bohr', description: 'Afinidade da hemoglobina pelo oxigênio diminui com pH baixo/CO2 alto.', trivia: 'Facilita a liberação de O2 nos tecidos.', rarity: 'rare', category: 'Clínica Médica' },
  { id: 'c38', title: 'Alexander Fleming', description: 'Descobriu a Penicilina.', trivia: 'Inaugurou a era dos antibióticos.', rarity: 'legendary', category: 'História' },
  { id: 'c39', title: 'Sinal de Kehr', description: 'Dor referida no ombro esquerdo.', trivia: 'Sugerido em casos de ruptura esplênica.', rarity: 'epic', category: 'Cirurgia' },
  { id: 'c40', title: 'Classificação de Hinchey', description: 'Estágios da diverticulite aguda complicada.', trivia: 'Vai do abscesso pericólico à peritonite purulenta.', rarity: 'epic', category: 'Cirurgia' },
  { id: 'c41', title: 'Tríade de Charcot', description: 'Febre, icterícia e dor em hipocôndrio direito.', trivia: 'Clássica da colangite aguda.', rarity: 'rare', category: 'Clínica Médica' },
  { id: 'c42', title: 'Pentalogia de Reynolds', description: 'Tríade de Charcot + hipotensão e alteração de consciência.', trivia: 'Indica colangite supurativa grave.', rarity: 'epic', category: 'Clínica Médica' },
  { id: 'c43', title: 'Louis Pasteur', description: 'Desenvolveu a vacina contra a raiva e a pasteurização.', trivia: 'Pai da microbiologia moderna.', rarity: 'legendary', category: 'História' },
  { id: 'c44', title: 'Sinal de Giordano', description: 'Punho-percussão lombar dolorosa.', trivia: 'Indica pielonefrite aguda.', rarity: 'common', category: 'Clínica Médica' },
  { id: 'c45', title: 'Índice de Apgar', description: 'Avaliação de vitalidade do recém-nascido.', trivia: 'Realizado no primeiro e no quinto minuto de vida.', rarity: 'common', category: 'Pediatria' },
  { id: 'c46', title: 'Sinal de Gersuny', description: 'Crepitação ao comprimir o abdome sobre fecaloma.', trivia: 'Indica presença de gás entre a massa fecal e a parede intestinal.', rarity: 'rare', category: 'Cirurgia' },
  { id: 'c47', title: 'Marie Curie', description: 'Pesquisas pioneiras sobre radioatividade.', trivia: 'Primeira mulher a ganhar o Prêmio Nobel.', rarity: 'legendary', category: 'História' },
  { id: 'c48', title: 'Sinal de Chvostek', description: 'Contração dos músculos faciais ao percutir o nervo facial.', trivia: 'Indica hipocalcemia.', rarity: 'rare', category: 'Clínica Médica' },
  { id: 'c49', title: 'Manobra de Barlow', description: 'Testa se o quadril do recém-nascido é deslocável.', trivia: 'Complementar à manobra de Ortolani.', rarity: 'epic', category: 'Pediatria' },
  { id: 'c50', title: 'Sinal de Trousseau', description: 'Espasmo carpal ao inflar o manguito acima da PAS.', trivia: 'Mais sensível que Chvostek para hipocalcemia.', rarity: 'rare', category: 'Clínica Médica' },
];

const NotificationToast = ({ notification, onDismiss }: { notification: AppNotification; onDismiss: (id: string) => void; key?: string }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 5000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  const icons = {
    achievement: <Award className="text-amber-500" size={24} />,
    promotion: <Crown className="text-emerald-500" size={24} />,
    card: <Star className="text-sky-500" size={24} />
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="bg-white border border-natural-200 rounded-2xl shadow-xl p-4 flex items-center gap-4 w-80 max-w-full pointer-events-auto"
    >
      <div className="p-3 bg-natural-50 rounded-xl">
        {icons[notification.type]}
      </div>
      <div className="flex-1 overflow-hidden">
        <h4 className="text-xs font-black uppercase tracking-tight text-natural-900 truncate">{notification.title}</h4>
        <p className="text-[10px] text-natural-muted font-medium leading-tight line-clamp-2 mt-1">{notification.message}</p>
      </div>
      <button 
        onClick={() => onDismiss(notification.id)}
        className="p-1 text-natural-300 hover:text-natural-600 transition-colors"
      >
        <XCircle size={16} />
      </button>
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState<View>('AUTH');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>(loadState());
  const [currentTest, setCurrentTest] = useState<{
    theme: string;
    questions: Question[];
    currentIndex: number;
    answers: (string | null)[];
    revealed: boolean[]; // tracks if the user clicked "Ver resposta"
    facilities: {
      skipped: number;
      eliminated: number;
      guaranteed: number;
    };
    activeGuaranteed: boolean;
    eliminatedInCurrent: string[];
    pointsCurrent: number;
    startTime: number;
    isAlwaysHard: boolean;
    markers: (Record<string, 'doubt' | 'discard' | null>)[];
    tempSelectedAnswer: string | null;
  } | null>(null);

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [contestingQuestion, setContestingQuestion] = useState<{ question: Question; index: number } | null>(null);
  const [isContesting, setIsContesting] = useState(false);
  const [mailboxOpen, setMailboxOpen] = useState(false);

  const lastLevelRef = useRef(appState.gamification.level);

  // Firebase Auth sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        // Load data from Firestore
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Load subcollections: history and errors
            const historySnap = await getDocs(query(collection(userDocRef, 'history'), orderBy('date', 'desc')));
            const history = historySnap.docs.map(d => d.data() as TestResult);
            
            const errorSnap = await getDocs(query(collection(userDocRef, 'errors')));
            const errorLog = errorSnap.docs.map(d => d.data() as ErrorLogEntry);

            const fetchedState: AppState = {
              points: data.points || 0,
              history: history,
              errorLog: errorLog,
              notifications: data.notifications || [],
              mailbox: data.mailbox || [],
              gamification: data.gamification || appState.gamification
            };
            setAppState(fetchedState);
          } else {
            // Create initial user doc if it doesn't exist
            const initialState = {
              userId: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              points: appState.points,
              gamification: appState.gamification,
              notifications: appState.notifications,
              mailbox: appState.mailbox,
              createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, initialState);
          }
          setView('HOME');
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
        setView('AUTH');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync state to Firebase on changes
  useEffect(() => {
    if (!user) {
      saveState(appState);
      return;
    }

    const syncToFirebase = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          points: appState.points,
          gamification: appState.gamification,
          notifications: appState.notifications,
          mailbox: appState.mailbox,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        // Fallback or quiet fail if it's just sync
        console.error("Firebase sync error", error);
      }
    };

    const timeout = setTimeout(syncToFirebase, 2000); // Debounce sync
    return () => clearTimeout(timeout);
  }, [appState, user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error", error);
    }
  };

  const handleLogout = async () => {
    try {
      triggerHaptic('medium');
      await signOut(auth);
      setAppState(loadState()); // Reset to local state
    } catch (error) {
      console.error("Logout Error", error);
    }
  };

  const addMail = (type: 'achievement' | 'promotion' | 'card', title: string, message: string, rewardData?: any) => {
    const id = Math.random().toString(36).substring(7);
    const newMail: MailItem = {
      id,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      claimed: false,
      rewardData
    };

    // Also add a notification (toast) as requested: "sempre que o aluno ganhar uma conquista... uma notificação aparece"
    const newNotification: AppNotification = {
      id: `toast-${id}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString()
    };
    
    setAppState(prev => ({
      ...prev,
      notifications: [newNotification, ...(prev.notifications || [])],
      mailbox: [newMail, ...(prev.mailbox || [])]
    }));

    triggerHaptic('success');
  };

  const redeemMail = (mailId: string) => {
    const mail = appState.mailbox.find(m => m.id === mailId);
    if (!mail) return;

    setAppState(prev => {
      let updatedGamification = { ...prev.gamification };
      let updatedPoints = prev.points;

      if (mail.type === 'achievement') {
        updatedGamification.medals = [...updatedGamification.medals, mail.rewardData];
      } else if (mail.type === 'card') {
        updatedGamification.collectedCards = [...updatedGamification.collectedCards, mail.rewardData.id];
      } else if (mail.type === 'promotion') {
        updatedGamification.level = mail.rewardData.level;
        // Optionally add bonus points for promotion? 
        updatedPoints += (mail.rewardData.level * 10);
      }

      return {
        ...prev,
        points: updatedPoints,
        mailbox: prev.mailbox.filter(m => m.id !== mailId),
        gamification: updatedGamification
      };
    });

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#5A6F5A', '#F27D26', '#E0E2DB', '#FFD700']
    });
    triggerHaptic('success');
  };

  const redeemAllMail = () => {
    setAppState(prev => {
      let updatedGamification = { ...prev.gamification };
      let updatedPoints = prev.points;

      prev.mailbox.forEach(mail => {
        if (mail.type === 'achievement') {
          updatedGamification.medals = [...updatedGamification.medals, mail.rewardData];
        } else if (mail.type === 'card') {
          updatedGamification.collectedCards = [...updatedGamification.collectedCards, mail.rewardData.id];
        } else if (mail.type === 'promotion') {
          updatedGamification.level = mail.rewardData.level;
          updatedPoints += (mail.rewardData.level * 10);
        }
      });

      return {
        ...prev,
        points: updatedPoints,
        mailbox: [],
        gamification: updatedGamification
      };
    });

    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#5A6F5A', '#F27D26', '#E0E2DB', '#FFD700']
    });
    triggerHaptic('success');
  };

  const dismissNotification = (id: string) => {
    setAppState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }));
  };

  const saveTestResult = async (result: TestResult) => {
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const historyRef = doc(collection(userRef, 'history'), result.id);
        
        await setDoc(historyRef, result);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/history`);
      }
    }
  };

  const saveErrorLog = async (entry: ErrorLogEntry) => {
    if (user) {
      try {
        const entryRef = doc(collection(doc(db, 'users', user.uid), 'errors'), entry.id);
        await setDoc(entryRef, entry);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/errors`);
      }
    }
  };

  // Level Up check (Toast only for reaching threshold, Mail for redemption)
  useEffect(() => {
    const nextLevel = calculateLevel(appState.gamification.xp);
    if (nextLevel > appState.gamification.level) {
      // Check if we already have a pending promotion for this level
      const alreadyHasPromotion = appState.mailbox.some(m => m.type === 'promotion' && m.rewardData.level === nextLevel);
      if (!alreadyHasPromotion) {
        const title = getTitle(nextLevel);
        addMail('promotion', 'Qualificação Disponível!', `Você acumulou experiência para ascender ao cargo de ${title}.`, { level: nextLevel });
      }
    }
  }, [appState.gamification.xp]);

  // Persistence effect
  useEffect(() => {
    saveState(appState);
  }, [appState]);

  // Mission Initialization & Maintenance
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const missions = appState.gamification.missions || [];
    
    const needsNewMissions = missions.length === 0 || missions.some(m => new Date(m.deadline) < new Date());

    if (needsNewMissions) {
      const dailyMissions = MISSIONS_SEED.filter(m => m.type === 'daily').sort(() => Math.random() - 0.5).slice(0, 5);
      const weeklyMissions = MISSIONS_SEED.filter(m => m.type === 'weekly').sort(() => Math.random() - 0.5).slice(0, 5);
      
      const newMissions: Mission[] = [...dailyMissions, ...weeklyMissions].map(m => ({
        ...m,
        progress: 0,
        completed: false,
        deadline: m.type === 'daily' ? `${today}T23:59:59Z` : new Date(Date.now() + 7 * 86400000).toISOString()
      }));
      setAppState(prev => ({
        ...prev,
        gamification: { ...prev.gamification, missions: newMissions }
      }));
    }
  }, [appState.gamification.missions?.length]);

  const accumulatedStats = useMemo(() => {
    const categories: any[] = [
      'Clínica Médica',
      'Cirurgia',
      'Ginecologia e Obstetrícia',
      'Pediatria',
      'Saúde Coletiva'
    ];

    return categories.map(cat => {
      let total = 0;
      let correct = 0;

      appState.history.forEach(res => {
        if (res.categoryPerformance) {
          const catStat = res.categoryPerformance.find(cs => cs.category === cat);
          if (catStat) {
            total += catStat.total;
            correct += catStat.correct;
          }
        }
      });

      return { category: cat, total, correct };
    });
  }, [appState.history]);

  // View Handlers
  const handleStartSimulado = () => setView('CONFIG');
  const handleViewHistory = () => setView('HISTORY');
  const goHome = () => setView('HOME');
  const handleViewErrorLog = () => setView('ERROR_LOG');
  const handleViewShop = () => setView('SHOP');
  const handleViewProfile = () => setView('PROFILE');
  const handleViewMissions = () => setView('MISSIONS');
  const handleViewSkills = () => setView('SKILLS');
  const handleViewCollection = () => setView('COLLECTION');
  const handleViewLuckySpin = () => setView('LUCKY_SPIN');
  const handleViewChefao = () => setView('CHEFÃO');

  const claimMissionReward = (missionId: string) => {
    const mission = appState.gamification.missions.find(m => m.id === missionId);
    if (!mission || !mission.completed) return;

    triggerHaptic('success');
    setAppState(prev => {
      const g = prev.gamification;
      const missions = g.missions.filter(m => m.id !== missionId);
      
      let streakShields = g.streakShields;
      if (mission.reward.items?.includes('shield')) {
        streakShields += 1;
      }

      const newXP = g.xp + (mission.reward.xp || 0);
      const newLevel = calculateLevel(newXP);

      return {
        ...prev,
        points: prev.points + (mission.reward.points || 0),
        gamification: {
          ...g,
          xp: newXP,
          level: newLevel,
          streakShields,
          missions,
          studyDaysCount: g.studyDaysCount // ensure consistency
        }
      };
    });
    // Update daily study days on mission completion if not already counted today
    setAppState(prev => updateActivityStreak(prev));
  };

  const spinLuckyWheel = () => {
    const now = new Date().toISOString().split('T')[0];
    if (appState.gamification.luckySpinLastUsed === now) {
      return;
    }

    triggerHaptic('heavy');
    const rewards = [
      { type: 'points', value: 10, label: '10 Pontos' },
      { type: 'points', value: 25, label: '25 Pontos' },
      { type: 'xp', value: 100, label: '100 XP' },
      { type: 'card', value: 1, label: 'Card Médico Raro' },
      { type: 'points', value: 50, label: '50 Pontos' },
    ];
    const reward = rewards[Math.floor(Math.random() * rewards.length)];

    setAppState(prev => {
      const now = new Date().toISOString().split('T')[0];
      let pendingCard = null;

      if (reward.type === 'card') {
        const collectedAndPending = [
          ...prev.gamification.collectedCards,
          ...prev.mailbox.filter(m => m.type === 'card').map(m => m.rewardData.id)
        ];
        const uncollected = MEDICAL_CARDS.filter(c => !collectedAndPending.includes(c.id));
        if (uncollected.length > 0) {
          const rareUncollected = uncollected.filter(c => c.rarity !== 'common');
          pendingCard = rareUncollected.length > 0 ? rareUncollected[0] : uncollected[0];
          
          setTimeout(() => addMail('card', 'Prêmio do Giro da Sorte!', `Você ganhou um novo Card Médico: ${pendingCard.title}`, pendingCard), 100);
        }
      }

      const newXP = prev.gamification.xp + (reward.type === 'xp' ? reward.value : 0);
      const newLevel = calculateLevel(newXP);

      return {
        ...prev,
        points: prev.points + (reward.type === 'points' ? reward.value : 0),
        gamification: {
          ...prev.gamification,
          xp: newXP,
          level: newLevel,
          luckySpinLastUsed: now,
          lastLuckyReward: reward.label
        }
      };
    });
  };

  const redoErrors = async (filter?: { category?: string }) => {
    const questions = appState.errorLog
      .filter(e => !filter?.category || e.question.category === filter.category)
      .map(e => e.question);
    
    if (questions.length === 0) {
      alert("Nenhum erro encontrado com este filtro.");
      return;
    }

    setView('LOADING');
    // Simulate generation from history
    setCurrentTest({
      theme: `Revisão: ${filter?.category || 'Todos os Erros'}`,
      questions: questions.sort(() => Math.random() - 0.5).slice(0, 10),
      currentIndex: 0,
      answers: new Array(Math.min(questions.length, 10)).fill(null),
      revealed: new Array(Math.min(questions.length, 10)).fill(false),
      facilities: { skipped: 0, eliminated: 0, guaranteed: 0 },
      activeGuaranteed: false,
      eliminatedInCurrent: [],
      pointsCurrent: 0,
      startTime: Date.now(),
      isAlwaysHard: false,
      markers: new Array(Math.min(questions.length, 10)).fill({}),
      tempSelectedAnswer: null
    });
    setView('QUIZ');
  };

  const redoSimilarErrors = async (filter?: { category?: string }) => {
    setView('LOADING');
    try {
      const activeErrors = appState.errorLog.filter(e => !e.isRevised);
      const errorsToUse = filter?.category 
        ? activeErrors.filter(e => e.question.category === filter.category)
        : activeErrors;

      if (errorsToUse.length === 0) {
        alert("Sem erros ativos para gerar reforço com este filtro!");
        setView('HOME');
        return;
      }
      
      const questions = await generateSimilarQuestions(errorsToUse, 10, filter?.category);
      setCurrentTest({
        theme: `Reforço: ${filter?.category || 'Temas Críticos'}`,
        questions,
        currentIndex: 0,
        answers: new Array(questions.length).fill(null),
        revealed: new Array(questions.length).fill(false),
        facilities: { skipped: 0, eliminated: 0, guaranteed: 0 },
        activeGuaranteed: false,
        eliminatedInCurrent: [],
        pointsCurrent: 0,
        startTime: Date.now(),
        isAlwaysHard: true,
        markers: new Array(questions.length).fill({}),
        tempSelectedAnswer: null
      });
      setView('QUIZ');
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar reforço de similares.");
      setView('ERROR_LOG');
    }
  };

  const handleViewSettings = () => setView('SETTINGS');

  const deleteHistory = () => {
    setConfirmingAction({
      title: "Apagar Histórico",
      message: "Atenção: ao apagar todo o histórico de testes, não será mais possível recuperar essas informações. Deseja continuar?",
      action: () => {
        setAppState(prev => ({ ...prev, history: [], errorLog: [] }));
        setConfirmingAction(null);
      }
    });
  };

  const resetPoints = () => {
    setConfirmingAction({
      title: "Resetar Pontos",
      message: "Tem certeza que deseja zerar sua pontuação? Esta ação é irreversível.",
      action: () => {
        setAppState(prev => ({ ...prev, points: 0 }));
        setConfirmingAction(null);
      }
    });
  };

  const resetStats = () => {
    setConfirmingAction({
      title: "Resetar Estatísticas",
      message: "Tem certeza que deseja zerar suas estatísticas de categoria? Seu histórico de testes será mantido, mas as métricas por especialidade voltarão ao zero.",
      action: () => {
        setAppState(prev => ({ ...prev, history: prev.history.map(h => ({ ...h, categoryPerformance: [] })) }));
        setConfirmingAction(null);
      }
    });
  };

  const resetCombo = () => {
    setConfirmingAction({
      title: "Resetar Combo",
      message: "Tem certeza que deseja zerar seu combo atual? Sua sequência de dias será perdida.",
      action: () => {
        setAppState(prev => ({ 
          ...prev, 
          gamification: { ...prev.gamification, currentStreak: 0, maxStreak: 0 } 
        }));
        setConfirmingAction(null);
      }
    });
  };

  const resetGamification = () => {
    setConfirmingAction({
      title: "Resetar Nível e XP",
      message: "Tem certeza que deseja zerar seu Nível e XP? Você voltará ao Nível 1.",
      action: () => {
        setAppState(prev => ({ 
          ...prev, 
          notifications: [],
          gamification: { ...prev.gamification, level: 1, xp: 0, medals: [], collectedCards: [] } 
        }));
        setConfirmingAction(null);
      }
    });
  };

  const buyItem = (cost: number, action: () => void) => {
    if (appState.points >= cost) {
      setAppState(prev => ({ ...prev, points: prev.points - cost }));
      action();
    } else {
      alert("Pontos insuficientes!");
    }
  };

  const updateErrorObservation = (id: string, observation: string) => {
    setAppState(prev => ({
      ...prev,
      errorLog: prev.errorLog.map(e => e.id === id ? { ...e, personalObservation: observation } : e)
    }));
  };

  const removeError = (id: string) => {
    setAppState(prev => ({
      ...prev,
      errorLog: prev.errorLog.filter(e => e.id !== id)
    }));
  };

  const markErrorRevised = (id: string) => {
    setAppState(prev => {
      const g = prev.gamification;
      const updatedMissions = g.missions.map(m => {
        if (m.completed || m.criterion.type !== 'revision') return m;
        const newProgress = Math.min(m.progress + 1, m.criterion.target);
        return { ...m, progress: newProgress, completed: newProgress >= m.criterion.target };
      });

      const newState = {
        ...prev,
        errorLog: prev.errorLog.map(e => e.id === id ? { ...e, isRevised: true } : e),
        gamification: {
          ...g,
          missions: updatedMissions
        }
      };
      
      // Also update study activity
      const activityState = updateActivityStreak(newState);
      return checkMedals(activityState);
    });
  };

  const handleContestQuestion = async (type: 'automatic' | 'manual', argument?: string) => {
    if (!contestingQuestion || !testResult) return;
    
    setIsContesting(true);
    triggerHaptic('medium');
    
    try {
      const review = await analyzeContestation(contestingQuestion.question, type, argument);
      
      const newContestation: Contestation = {
        questionId: contestingQuestion.question.id,
        type,
        studentArgument: argument,
        status: review.status,
        aiFeedback: review.feedback,
        revisedAt: new Date().toISOString()
      };

      setAppState(prev => {
        // Update history
        const updatedHistory = prev.history.map(h => {
          if (h.id === testResult.id) {
            const currentContestations = h.contestedQuestions || [];
            const result = {
              ...h,
              contestedQuestions: [...currentContestations, newContestation]
            };

            // If accepted, improve score
            if (review.status === 'accepted') {
              const questionIdx = result.questions.findIndex(q => q.id === contestingQuestion.question.id);
              const wasWrong = result.userAnswers[questionIdx] !== contestingQuestion.question.correctAlternative;
              
              if (wasWrong) {
                result.pointsEarned += 1;
                result.scoreAfter += 1;
              }
            }
            return result;
          }
          return h;
        });

        // Update total points and testResult UI
        const currentTestInHistory = updatedHistory.find(h => h.id === testResult.id);
        if (currentTestInHistory) {
          setTestResult(currentTestInHistory);
        }

        return {
          ...prev,
          points: review.status === 'accepted' ? prev.points + 1 : prev.points,
          history: updatedHistory
        };
      });

      if (review.status === 'accepted') {
        triggerHaptic('success');
      } else {
        triggerHaptic('error');
      }

    } catch (error) {
      console.error(error);
      alert("Erro ao processar contestação.");
    } finally {
      setIsContesting(false);
      setContestingQuestion(null);
    }
  };

  const startQuiz = async (theme: string, count: number, alwaysHard: boolean, originFilter: 'all' | 'official' | 'inedited' = 'all') => {
    setView('LOADING');
    try {
      const questions = await generateQuestions(theme, count, alwaysHard, originFilter);
      setCurrentTest({
        theme,
        questions,
        currentIndex: 0,
        answers: new Array(questions.length).fill(null),
        revealed: new Array(questions.length).fill(false),
        facilities: { skipped: 0, eliminated: 0, guaranteed: 0 },
        activeGuaranteed: false,
        eliminatedInCurrent: [],
        pointsCurrent: 0,
        startTime: Date.now(),
        isAlwaysHard: alwaysHard,
        markers: new Array(questions.length).fill({}),
        tempSelectedAnswer: null
      });
      setView('QUIZ');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao carregar simulado');
      setView('CONFIG');
    }
  };

  const finishQuiz = (finalAnswers?: (string | null)[], finalRevealed?: boolean[]) => {
    const test = currentTest;
    if (!test) return;

    const answers = finalAnswers || test.answers;
    const revealed = finalRevealed || test.revealed;

    const correctCount = answers.reduce((acc, ans, idx) => {
      return ans === test.questions[idx].correctAlternative ? acc + 1 : acc;
    }, 0);

    const categories: any[] = [
      'Clínica Médica',
      'Cirurgia',
      'Ginecologia e Obstetrícia',
      'Pediatria',
      'Saúde Coletiva'
    ];

    const categoryPerformance = categories.map(cat => {
      const catQuestions = test.questions.filter(q => q.category === cat);
      const total = catQuestions.length;
      const correct = catQuestions.reduce((acc, q) => {
        const qIdx = test.questions.findIndex(tq => tq.id === q.id);
        return answers[qIdx] === q.correctAlternative ? acc + 1 : acc;
      }, 0);
      return { category: cat, total, correct };
    });

    const newErrors: ErrorLogEntry[] = [];
    test.questions.forEach((q, idx) => {
      if (answers[idx] !== q.correctAlternative && answers[idx] !== 'SKIPPED') {
        newErrors.push({
          id: `err-${Date.now()}-${idx}`,
          question: q,
          userAnswer: answers[idx],
          timestamp: new Date().toISOString(),
          isRevised: false
        });
      }
    });

    const multiplier = getXPMultiplier(appState.gamification.currentStreak);
    const baseXP = 10 + (correctCount * 5);
    const xpEarned = Math.floor(baseXP * multiplier);
    const newXP = appState.gamification.xp + xpEarned;
    const newLevel = calculateLevel(newXP);

    // High performance reward: 1 card for > 80% accuracy
    const pct = Math.round((correctCount / test.questions.length) * 100);
    let pendingCard = null;
    if (pct >= 80) {
      const collectedAndPending = [
        ...appState.gamification.collectedCards,
        ...appState.mailbox.filter(m => m.type === 'card').map(m => m.rewardData.id)
      ];
      const uncollected = MEDICAL_CARDS.filter(c => !collectedAndPending.includes(c.id));
      if (uncollected.length > 0) {
        pendingCard = uncollected[Math.floor(Math.random() * uncollected.length)];
      }
    }

    // Update Missions
    // ... (rest of mission logic)
      const updatedMissions = appState.gamification.missions.map(m => {
        if (m.completed) return m;
        let addedProgress = 0;
        if (m.criterion.type === 'category_target') {
          if (m.criterion.category === 'TODAS') {
            addedProgress = test.questions.length;
          } else {
            const catPerf = categoryPerformance.find(cp => cp.category === m.criterion.category);
            if (catPerf) addedProgress = catPerf.correct;
          }
        } else if (m.criterion.type === 'simulator_no_facilities') {
          const noFac = test.facilities.skipped === 0 && test.facilities.eliminated === 0 && test.facilities.guaranteed === 0;
          if (noFac) addedProgress = 1;
        } else if (m.criterion.type === 'revision') {
          // If it was a redirection test from error log or similar questions
          if (test.theme.includes('Revisão') || test.theme.includes('Reforço')) {
            addedProgress = correctCount;
          }
        }
        
        const newProgress = Math.min(m.progress + addedProgress, m.criterion.target);
        return { ...m, progress: newProgress, completed: newProgress >= m.criterion.target };
      });

    // Update Skill Tree
    const updatedSkillTree = appState.gamification.skillTree.map(node => {
      const perf = categoryPerformance.find(cp => cp.category === node.category);
      if (perf && perf.correct > 0) {
        const nodeXPGained = perf.correct * 20;
        const totalXP = node.xp + nodeXPGained;
        const newLevel = Math.floor(totalXP / 500) + 1;
        return { ...node, xp: totalXP, level: newLevel };
      }
      return node;
    });

    const result: TestResult = {
      id: `res-${Date.now()}`,
      date: new Date().toISOString(),
      theme: test.theme,
      questions: test.questions,
      userAnswers: answers,
      revealedAnswers: revealed,
      categoryPerformance,
      pointsEarned: correctCount,
      scoreBefore: appState.points,
      scoreAfter: appState.points + correctCount,
      difficultyMode: test.isAlwaysHard ? 'always_hard' : 'standard',
      facilitiesUsed: test.facilities,
      auxiliaryMarkers: test.markers
    };

    setTestResult(result);
    // update state with errorLog and gamification
    setAppState(prev => {
      let newState = {
        ...prev,
        points: result.scoreAfter,
        history: [result, ...prev.history],
        errorLog: [...newErrors, ...prev.errorLog],
        gamification: {
          ...prev.gamification,
          xp: newXP,
          level: newLevel,
          missions: updatedMissions,
          skillTree: updatedSkillTree
        }
      };
      
      newState = updateActivityStreak(newState);

      // Async saves for subcollections
      saveTestResult(result);
      newErrors.forEach(err => saveErrorLog(err));

      // check for medals but DON'T add them to gamification yet
      const earnedMedals = findNewMedals(newState);
      
      // Trigger mailbox for medals and cards
      if (pendingCard) {
        setTimeout(() => addMail('card', 'Novo Card Disponível!', `Você desbloqueou um novo Card Médico pela sua performance em ${result.theme}`, pendingCard), 100);
      }
      
      earnedMedals.forEach((m, i) => {
        setTimeout(() => addMail('achievement', 'Nova Conquista!', `Você desbloqueou a medalha: ${m.title}`, m), 200 + (i * 100));
      });

      return newState;
    });
    setView('RESULT');
    setCurrentTest(null);
  };

  // Facility Actions
  const useSkip = () => {
    if (!currentTest || appState.points < 3) return;
    
    triggerHaptic('medium');
    const nextIndex = currentTest.currentIndex + 1;
    const newAnswers = [...currentTest.answers];
    newAnswers[currentTest.currentIndex] = 'SKIPPED';
    
    setAppState(prev => ({ ...prev, points: prev.points - 3 }));
    
    if (nextIndex >= currentTest.questions.length) {
      finishQuiz(newAnswers);
    } else {
      setCurrentTest(prev => prev ? ({
        ...prev,
        currentIndex: nextIndex,
        answers: newAnswers,
        facilities: { ...prev.facilities, skipped: prev.facilities.skipped + 1 },
        eliminatedInCurrent: [],
        activeGuaranteed: false
      }) : null);
    }
  };

  const useEliminate = () => {
    if (!currentTest || appState.points < 10 || currentTest.eliminatedInCurrent.length > 0 || currentTest.answers[currentTest.currentIndex] !== null) return;
    
    triggerHaptic('medium');
    const currentQ = currentTest.questions[currentTest.currentIndex];
    const wrongAlts = currentQ.alternatives
      .filter(a => a.id !== currentQ.correctAlternative)
      .map(a => a.id);
    
    // Shuffle and pick 2
    const eliminated = [...wrongAlts].sort(() => Math.random() - 0.5).slice(0, 2);

    setAppState(prev => ({ ...prev, points: prev.points - 10 }));
    setCurrentTest(prev => prev ? ({
      ...prev,
      eliminatedInCurrent: eliminated,
      facilities: { ...prev.facilities, eliminated: prev.facilities.eliminated + 1 }
    }) : null);
  };

  const useGuaranteed = () => {
    if (!currentTest || appState.points < 20 || currentTest.answers[currentTest.currentIndex] !== null) return;
    
    triggerHaptic('heavy');
    const correctAltId = currentTest.questions[currentTest.currentIndex].correctAlternative;
    const newAnswers = [...currentTest.answers];
    newAnswers[currentTest.currentIndex] = correctAltId;
    
    const newRevealed = [...currentTest.revealed];
    newRevealed[currentTest.currentIndex] = true;

    setAppState(prev => ({ ...prev, points: prev.points - 20 }));
    setCurrentTest(prev => prev ? ({
      ...prev,
      answers: newAnswers,
      revealed: newRevealed,
      activeGuaranteed: true,
      facilities: { ...prev.facilities, guaranteed: prev.facilities.guaranteed + 1 }
    }) : null);
  };

  const handleReveal = () => {
    if (!currentTest) return;
    triggerHaptic('medium');
    const newRevealed = [...currentTest.revealed];
    newRevealed[currentTest.currentIndex] = true;
    setCurrentTest(prev => prev ? ({ ...prev, revealed: newRevealed }) : null);
  };

  const handleAnswer = (altId: string) => {
    if (!currentTest) return;
    if (currentTest.answers[currentTest.currentIndex] !== null) return; // Already answered

    triggerHaptic('light');
    setCurrentTest(prev => prev ? ({ ...prev, tempSelectedAnswer: altId }) : null);
  };

  const confirmAnswer = () => {
    if (!currentTest || !currentTest.tempSelectedAnswer) return;
    
    triggerHaptic('medium');
    const newAnswers = [...currentTest.answers];
    newAnswers[currentTest.currentIndex] = currentTest.tempSelectedAnswer;

    setCurrentTest(prev => prev ? ({ 
      ...prev, 
      answers: newAnswers,
      tempSelectedAnswer: null 
    }) : null);
  };

  const toggleMarker = (altId: string, marker: 'doubt' | 'discard') => {
    if (!currentTest) return;
    triggerHaptic('light');
    const newMarkers = [...currentTest.markers];
    const currentQMarkers = { ...newMarkers[currentTest.currentIndex] };
    
    if (currentQMarkers[altId] === marker) {
      delete currentQMarkers[altId];
    } else {
      currentQMarkers[altId] = marker;
    }
    
    newMarkers[currentTest.currentIndex] = currentQMarkers;
    setCurrentTest(prev => prev ? ({ ...prev, markers: newMarkers }) : null);
  };

  const nextQuestion = () => {
    if (!currentTest) return;
    triggerHaptic('light');
    const nextIndex = currentTest.currentIndex + 1;
    if (nextIndex >= currentTest.questions.length) {
      finishQuiz();
    } else {
      setCurrentTest(prev => prev ? ({ 
        ...prev, 
        currentIndex: nextIndex,
        eliminatedInCurrent: [],
        activeGuaranteed: false
      }) : null);
    }
  };

  const jumpToQuestion = (index: number) => {
    if (!currentTest) return;
    triggerHaptic('light');
    setCurrentTest(prev => prev ? ({
      ...prev,
      currentIndex: index,
      eliminatedInCurrent: [],
      activeGuaranteed: false
    }) : null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-natural-100 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-natural-900 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (view === 'AUTH') {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-natural-100 flex flex-col font-sans text-natural-800">
      <Navbar 
        points={appState.points} 
        onGoHome={goHome} 
        onSettings={handleViewSettings} 
        onViewMailbox={() => setMailboxOpen(true)}
        unreadMailCount={appState.mailbox?.length || 0}
        user={user}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {confirmingAction && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-natural-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6 text-center"
              >
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mx-auto">
                  <AlertTriangle size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-tight text-natural-900">{confirmingAction.title}</h3>
                  <p className="text-sm text-natural-muted font-medium">{confirmingAction.message}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmingAction(null)}
                    className="flex-1 py-3 rounded-xl border-2 border-natural-200 text-natural-600 font-black text-xs uppercase hover:bg-natural-50 transition-all font-sans"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmingAction.action}
                    className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-black text-xs uppercase hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 font-sans"
                  >
                    Resetar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
          {view === 'HOME' && (
            <HomeView 
              points={appState.points} 
              history={appState.history}
              gamification={appState.gamification}
              stats={accumulatedStats}
              onStart={handleStartSimulado} 
              onHistory={handleViewHistory} 
              onViewErrorLog={handleViewErrorLog}
              onViewShop={handleViewShop}
              onViewProfile={handleViewProfile}
              onViewSettings={handleViewSettings}
              onViewMissions={handleViewMissions}
              onViewSkills={handleViewSkills}
              onViewCollection={handleViewCollection}
              onViewLuckySpin={handleViewLuckySpin}
              onViewChefao={handleViewChefao}
              onViewMailbox={() => setMailboxOpen(true)}
              unreadMailCount={appState.mailbox?.length || 0}
            />
          )}
          {view === 'ERROR_LOG' && (
            <ErrorLogView 
               errorLog={appState.errorLog}
               onBack={goHome}
               onRedo={(f) => redoErrors(f)}
               onRedoSimilar={(f) => redoSimilarErrors(f)}
               onUpdateObservation={updateErrorObservation}
               onRemove={removeError}
               onMarkRevised={markErrorRevised}
            />
          )}
          {view === 'SHOP' && (
            <ShopView 
              points={appState.points}
              onBack={goHome}
              onBuy={(cost) => {
                if (appState.points < cost) return alert("Pontos insuficientes!");
                setAppState(prev => ({ ...prev, points: prev.points - cost }));
                alert("Recurso adquirido com sucesso!");
              }}
            />
          )}
          {view === 'PROFILE' && (
            <ProfileView 
               gamification={appState.gamification}
               history={appState.history}
               errorLog={appState.errorLog}
               stats={accumulatedStats}
               onBack={goHome}
               onSettings={handleViewSettings}
            />
          )}
          {view === 'MISSIONS' && (
            <MissionsCenterView 
              missions={appState.gamification.missions}
              onBack={goHome}
              onClaim={claimMissionReward}
            />
          )}
          {view === 'SKILLS' && (
            <SkillsTreeView 
              skillTree={appState.gamification.skillTree}
              onBack={goHome}
            />
          )}
          {view === 'COLLECTION' && (
            <CollectionAlbumView 
              collectedIds={appState.gamification.collectedCards}
              onBack={goHome}
            />
          )}
          {view === 'LUCKY_SPIN' && (
            <LuckySpinView 
              onBack={goHome}
              onSpin={spinLuckyWheel}
              lastUsed={appState.gamification.luckySpinLastUsed}
              lastReward={appState.gamification.lastLuckyReward}
            />
          )}
          {view === 'CHEFÃO' && (
            <ChefaoView 
              onBack={goHome}
              studyDays={appState.gamification.studyDaysCount}
              onStartBoss={(type) => {
                if (appState.gamification.studyDaysCount < 10) {
                  return alert("Você precisa de 10 dias de estudo acumulados para enfrentar o Chefão!");
                }
                const now = new Date();
                const pastDate = new Date();
                pastDate.setDate(now.getDate() - (type === 'monthly' ? 30 : 7));
                
                const themeSuffix = type === 'monthly' ? 'Últimos 30 dias' : 'Última Semana';
                startQuiz(`Chefão: Revisão ${themeSuffix}`, type === 'monthly' ? 50 : 20, true);
              }}
            />
          )}
          {view === 'SETTINGS' && (
            <SettingsView 
              onBack={goHome}
              onDeleteHistory={deleteHistory}
              onResetPoints={resetPoints}
              onResetStats={resetStats}
              onResetCombo={resetCombo}
              onResetGamification={resetGamification}
            />
          )}
          {view === 'CONFIG' && (
            <ConfigView onBack={goHome} onGenerate={(t, c, h, o) => startQuiz(t, c, h, o)} points={appState.points} />
          )}
          {view === 'LOADING' && <LoadingView />}
          {view === 'QUIZ' && currentTest && (
            <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-8">
              <div className="order-2 lg:order-1">
                <QuizView 
                  test={currentTest} 
                  points={appState.points}
                  onAnswer={handleAnswer} 
                  onConfirm={confirmAnswer}
                  onToggleMarker={toggleMarker}
                  onSkip={useSkip}
                  onEliminate={useEliminate}
                  onGuaranteed={useGuaranteed}
                  onReveal={handleReveal}
                  onNext={nextQuestion}
                  eliminated={currentTest.eliminatedInCurrent}
                />
              </div>
              <div className="order-1 lg:order-2">
                <QuizSidebar 
                  questions={currentTest.questions}
                  answers={currentTest.answers}
                  revealed={currentTest.revealed}
                  currentIndex={currentTest.currentIndex}
                  onJump={jumpToQuestion}
                />
              </div>
            </div>
          )}
          {view === 'RESULT' && testResult && (
            <ResultView 
              result={testResult} 
              onHome={goHome} 
              onReview={() => setView('REVIEW')} 
            />
          )}
          {view === 'REVIEW' && testResult && (
            <ReviewView 
              result={testResult} 
              onBack={() => setView('RESULT')} 
              onContest={(q, idx) => setContestingQuestion({ question: q, index: idx })}
            />
          )}
          {view === 'HISTORY' && (
            <HistoryView 
              history={appState.history} 
              onBack={goHome} 
              onReview={(res) => {
                setTestResult(res);
                setView('REVIEW');
              }} 
            />
          )}
        </AnimatePresence>

        <ContestationModal 
          isOpen={!!contestingQuestion} 
          onClose={() => setContestingQuestion(null)}
          onSubmit={handleContestQuestion}
          loading={isContesting}
        />

        <MailboxModal 
          isOpen={mailboxOpen}
          onClose={() => setMailboxOpen(false)}
          mails={appState.mailbox || []}
          onRedeem={redeemMail}
          onRedeemAll={redeemAllMail}
        />

        {/* Notifications Overlay */}
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
          <AnimatePresence>
            {appState.notifications?.map(n => (
              <NotificationToast key={n.id} notification={n} onDismiss={dismissNotification} />
            ))}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- View Components ---

function HomeView({ 
  points, 
  history, 
  gamification, 
  stats,
  onStart, 
  onHistory, 
  onViewErrorLog, 
  onViewShop, 
  onViewProfile,
  onViewSettings,
  onViewMissions,
  onViewSkills,
  onViewCollection,
  onViewLuckySpin,
  onViewChefao,
  onViewMailbox,
  unreadMailCount
}: { 
  points: number; 
  history: TestResult[]; 
  gamification: any;
  stats: CategoryStats[];
  onStart: () => void; 
  onHistory: () => void; 
  onViewErrorLog: () => void;
  onViewShop: () => void;
  onViewProfile: () => void;
  onViewSettings: () => void;
  onViewMissions: () => void;
  onViewSkills: () => void;
  onViewCollection: () => void;
  onViewLuckySpin: () => void;
  onViewChefao: () => void;
  onViewMailbox: () => void;
  unreadMailCount: number;
}) {
  const multiplier = getXPMultiplier(gamification.currentStreak);
  const title = getTitle(gamification.level);
  const nextTitleLevel = (gamification.level % 2 === 0) ? gamification.level + 1 : gamification.level + 2;
  const nextTitle = getTitle(nextTitleLevel);
  
  let flameColor = "text-natural-200";
  let flameScale = "";
  if (gamification.currentStreak >= 30) {
    flameColor = "text-amber-500 fill-amber-500";
    flameScale = "scale-125";
  } else if (gamification.currentStreak >= 15) {
    flameColor = "text-purple-500 fill-purple-500";
    flameScale = "scale-110";
  } else if (gamification.currentStreak >= 7) {
    flameColor = "text-sky-500 fill-sky-500";
  } else if (gamification.currentStreak > 0) {
    flameColor = "text-orange-500 fill-orange-500";
  }

  const activeMissionsCount = (gamification.missions || []).filter((m: any) => !m.completed).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 text-center py-4"
    >
      {unreadMailCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onViewMailbox}
          className="bg-natural-900 text-white p-4 rounded-3xl flex items-center justify-between cursor-pointer group shadow-xl shadow-natural-900/10"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-bounce">
              <Mail size={24} />
            </div>
            <div className="text-left">
              <p className="text-sm font-black uppercase tracking-tight">Você tem {unreadMailCount} Mensagens!</p>
              <p className="text-[10px] font-bold text-white/60">Novas conquistas e prêmios aguardam você.</p>
            </div>
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest group-hover:bg-white group-hover:text-natural-900 transition-all">
            Abrir Caixa
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Profile / Patente Card */}
        <div 
          onClick={onViewProfile}
          className="medical-card p-6 bg-gradient-to-br from-natural-700 to-natural-900 text-white cursor-pointer hover:scale-[1.02] transition-all flex flex-col items-center justify-center space-y-3 relative overflow-hidden group col-span-1 md:col-span-2"
        >
          <DnaIcon size={120} className="absolute -right-10 -bottom-10 text-white/5 rotate-12 transition-transform group-hover:rotate-45" />
          <div className="relative z-10 flex items-center gap-4 w-full">
            <div className="relative">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-md">
                <Crown size={32} />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-white shadow-lg">
                LVL {gamification.level}
              </div>
            </div>
            <div className="text-left flex-1">
              <h3 className="text-lg font-black uppercase tracking-tighter leading-none">{title}</h3>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">XP: {gamification.xp} • Próximo Título: {nextTitle} (LVL {nextTitleLevel})</p>
              <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${(gamification.xp % 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Multiplier / Streak Card */}
        <div className="medical-card p-5 flex flex-col items-center justify-center space-y-2 border-natural-200 bg-white relative group overflow-hidden">
          <Flame size={32} className={`${flameColor} ${flameScale} transition-all duration-500`} />
          <div className="text-center z-10">
            <p className="text-2xl font-black text-natural-900 leading-none">{gamification.currentStreak}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-natural-muted">Combo Atual</p>
          </div>
          {gamification.streakShields > 0 && (
             <div className="absolute top-2 right-2 flex items-center gap-1 text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-100" title="Escudo de Streak Ativo">
               <ShieldCheck size={10} />
               <span className="text-[8px] font-black">{gamification.streakShields}</span>
             </div>
          )}
          <div className="mt-2 text-[10px] bg-natural-50 px-2 py-1 rounded-full border border-natural-100 font-black text-natural-600 uppercase">
             XP {multiplier}x
          </div>
        </div>

        {/* Resource Button (Shop/Spin) */}
        <div className="grid grid-rows-2 gap-2">
           <button onClick={onViewLuckySpin} className="medical-card p-3 flex items-center gap-3 border-natural-200 bg-amber-50 hover:bg-amber-100 transition-all group">
             <Dice5 size={20} className="text-amber-600 group-hover:rotate-180 transition-transform duration-700" />
             <div className="text-left">
               <p className="text-[10px] font-black text-amber-700 uppercase tracking-tighter">Giro Diário</p>
               <p className="text-[8px] font-bold text-amber-600/70 uppercase">Tente sua sorte</p>
             </div>
           </button>
           <button onClick={onViewShop} className="medical-card p-3 flex items-center gap-3 border-natural-200 bg-emerald-50 hover:bg-emerald-100 transition-all group">
             <Store size={20} className="text-emerald-600 group-hover:scale-110 transition-transform" />
             <div className="text-left">
               <p className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">Mercado Médico</p>
               <p className="text-[8px] font-bold text-emerald-600/70 uppercase">Use seus {points} pts</p>
             </div>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-6">
        <button onClick={onStart} className="btn-primary flex flex-col items-center justify-center gap-2 py-6 group shadow-lg min-h-[100px]">
          <Play size={24} className="fill-white group-hover:scale-110 transition-transform" />
          <span className="text-sm font-black uppercase tracking-tighter">Novo Teste</span>
        </button>

        <button onClick={onViewErrorLog} className="btn-secondary flex flex-col items-center justify-center gap-2 py-6 group bg-natural-50 border-natural-200 text-natural-700 hover:bg-natural-100 min-h-[100px]">
          <BookOpen size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-black uppercase tracking-tighter text-center">Caderno de Erros</span>
        </button>

        <button onClick={onHistory} className="btn-secondary flex flex-col items-center justify-center gap-2 py-6 group bg-natural-50 border-natural-200 text-natural-700 hover:bg-natural-100 min-h-[100px]">
          <History size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-black uppercase tracking-tighter">Histórico</span>
        </button>
        
        <button onClick={onViewMissions} className="btn-secondary flex flex-col items-center justify-center gap-2 py-6 group bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 min-h-[100px] relative">
          <Target size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-black uppercase tracking-tighter">Missões</span>
          {activeMissionsCount > 0 && (
            <span className="absolute top-2 right-2 bg-rose-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">{activeMissionsCount}</span>
          )}
        </button>

        <button onClick={onViewSkills} className="btn-secondary flex flex-col items-center justify-center gap-2 py-6 group bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 min-h-[100px]">
          <Zap size={24} className="group-hover:translate-y-[-2px] transition-transform" />
          <span className="text-sm font-black uppercase tracking-tighter">Habilidades</span>
        </button>

        <button onClick={onViewChefao} className="btn-secondary flex flex-col items-center justify-center gap-2 py-6 group bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 min-h-[100px]">
          <Sword size={24} className="group-hover:rotate-12 transition-transform" />
          <span className="text-sm font-black uppercase tracking-tighter">Chefão</span>
        </button>

        <button onClick={onViewCollection} className="btn-secondary flex flex-col items-center justify-center gap-2 py-6 group bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 min-h-[100px]">
          <Dna size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-black uppercase tracking-tighter">Álbum</span>
        </button>

        <button onClick={onViewSettings} className="btn-secondary flex flex-col items-center justify-center gap-2 py-6 group min-h-[100px]">
          <Settings size={24} className="group-hover:rotate-45 transition-transform" />
          <span className="text-sm font-black uppercase tracking-tighter">Ajustes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 mt-8">
        <div className="medical-card p-6 bg-white border-natural-200 text-left space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-natural-100 pb-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-natural-muted flex items-center gap-2">
              <Compass size={16} /> Radar de Especialidades
            </h3>
            <button onClick={onViewSkills} className="text-[10px] font-black text-natural-400 hover:text-natural-600 uppercase">Ver árvore completa</button>
          </div>
          <CategoryStatsGrid stats={stats} />
        </div>

        <div className="space-y-4">
          <div className="medical-card p-5 bg-natural-900 text-white space-y-4 relative overflow-hidden group h-full">
             <Trophy size={120} className="absolute -right-10 -bottom-10 text-white/5 rotate-12 transition-transform group-hover:rotate-45" />
             <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Desafio de Estudo</h4>
                   <p className="text-lg font-black uppercase tracking-tighter">Chefão Revalida</p>
                   <p className="text-xs text-white/50 font-medium mt-1">Acumule 10 dias de atividade para desbloquear o maior desafio do exame.</p>
                </div>
                
                <div className="mt-6 flex items-center gap-2">
                   <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${Math.min((gamification.studyDaysCount || 0) * 10, 100)}%` }} />
                   </div>
                   <span className="text-[10px] font-black">{Math.min((gamification.studyDaysCount || 0), 10)}/10</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ConfigView({ onBack, onGenerate, points }: { 
  onBack: () => void; 
  onGenerate: (theme: string, count: number, alwaysHard: boolean, originFilter: 'all' | 'official' | 'inedited') => void; 
  points: number 
}) {
  const [theme, setTheme] = useState('');
  const [count, setCount] = useState(10);
  const [alwaysHard, setAlwaysHard] = useState(false);
  const [originFilter, setOriginFilter] = useState<'all' | 'official' | 'inedited'>('all');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-natural-200 rounded-lg transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold">Configurar Simulado</h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-natural-700 font-sans">Qual o tema do simulado?</label>
          <input 
            type="text" 
            placeholder="Ex: IVAS, Valvulopatias, Sangrado Uterino..." 
            className="w-full p-4 rounded-xl border border-natural-200 focus:ring-2 focus:ring-natural-600 focus:border-natural-600 outline-none transition-all bg-white font-sans"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <label className="text-sm font-semibold text-natural-700 font-sans">Grandes Áreas (Atalhos)</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { name: 'Cirurgia', icon: <Sword size={18} />, color: 'bg-rose-50 text-rose-600 border-rose-200', active: 'border-rose-600 bg-rose-600 !text-white' },
              { name: 'Pediatria', icon: <Dna size={18} />, color: 'bg-sky-50 text-sky-600 border-sky-200', active: 'border-sky-600 bg-sky-600 !text-white' },
              { name: 'Clínica Médica', icon: <ShieldCheck size={18} />, color: 'bg-emerald-50 text-emerald-600 border-emerald-200', active: 'border-emerald-600 bg-emerald-600 !text-white' },
              { name: 'Ginecologia e Obstetrícia', icon: <Flashlight size={18} />, color: 'bg-purple-50 text-purple-600 border-purple-200', active: 'border-purple-600 bg-purple-600 !text-white' },
              { name: 'Saúde Coletiva', icon: <Target size={18} />, color: 'bg-amber-50 text-amber-600 border-amber-200', active: 'border-amber-600 bg-amber-600 !text-white' }
            ].map((area) => (
              <button 
                key={area.name}
                onClick={() => setTheme(area.name)}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 group ${theme === area.name ? area.active : area.color + ' hover:border-natural-200 hover:scale-[1.02]'}`}
              >
                <div className={theme === area.name ? 'text-white' : ''}>
                  {area.icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter text-center leading-tight">
                  {area.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-semibold text-natural-700 font-sans">Origem das Questões</label>
          <div className="grid grid-cols-3 gap-3">
             <button 
              onClick={() => setOriginFilter('all')}
              className={`p-3 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-tighter ${originFilter === 'all' ? 'border-natural-600 bg-natural-600 text-white shadow-md' : 'border-natural-100 bg-white text-natural-400'}`}
            >
              Misto
            </button>
            <button 
              onClick={() => setOriginFilter('official')}
              className={`p-3 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-tighter ${originFilter === 'official' ? 'border-natural-600 bg-natural-600 text-white shadow-md' : 'border-natural-100 bg-white text-natural-400'}`}
            >
              Oficiais INEP
            </button>
            <button 
              onClick={() => setOriginFilter('inedited')}
              className={`p-3 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-tighter ${originFilter === 'inedited' ? 'border-natural-600 bg-natural-600 text-white shadow-md' : 'border-natural-100 bg-white text-natural-400'}`}
            >
              Inéditas Style
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-semibold text-natural-700 font-sans">Quantidade de questões</label>
          <div className="grid grid-cols-5 gap-3">
            {[10, 20, 30, 40, 50].map((num) => (
              <button 
                key={num}
                onClick={() => setCount(num)}
                className={`py-4 rounded-xl border-2 font-bold transition-all ${count === num ? 'bg-natural-600 border-natural-600 text-white shadow-lg ring-4 ring-natural-600/20' : 'bg-white border-natural-200 text-natural-muted hover:border-natural-400'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all cursor-pointer ${alwaysHard ? 'bg-natural-600 border-natural-600 text-white shadow-lg' : 'bg-white border-natural-200 text-natural-800'}`} onClick={() => setAlwaysHard(!alwaysHard)}>
          <div className="space-y-0.5">
            <p className="font-bold text-lg font-sans">Sempre questões difíceis</p>
            <p className={`text-xs ${alwaysHard ? 'text-white/80' : 'text-natural-muted'}`}>Focar 100% em questões de alta complexidade</p>
          </div>
          <div className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center ${alwaysHard ? 'bg-white' : 'bg-natural-200'}`}>
            <motion.div 
              animate={{ x: alwaysHard ? 24 : 0 }}
              className={`w-6 h-6 rounded-full shadow-sm ${alwaysHard ? 'bg-natural-600' : 'bg-white'}`} 
            />
          </div>
        </div>

        <div className="p-4 bg-natural-50 border border-natural-200 rounded-xl text-xs text-natural-muted flex gap-3">
          <HelpCircle size={18} className="shrink-0 text-natural-600" />
          <p>
            Se a opção "Sempre questões difíceis" estiver desligada, usaremos a distribuição: 40% Difíceis, 30% Médias e 30% Fáceis.
          </p>
        </div>

        <button 
          disabled={!theme.trim()}
          onClick={() => onGenerate(theme, count, alwaysHard, originFilter)} 
          className="btn-primary w-full py-5 text-xl mt-4 font-sans uppercase tracking-[2px]"
        >
          Iniciar Simulado
        </button>
      </div>
    </motion.div>
  );
}

function QuizSidebar({ questions, answers, revealed, currentIndex, onJump }: { 
  questions: Question[]; 
  answers: (string | null)[]; 
  revealed: boolean[];
  currentIndex: number;
  onJump: (idx: number) => void;
}) {
  return (
    <div className="flex flex-col gap-6 sticky top-[100px] h-fit">
      <div className="medical-card p-4 lg:p-6 border-natural-200 space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-natural-muted">Progresso das Questões</h3>
        
        {/* Mobile Horizontal Scroll */}
        <div className="flex lg:grid lg:grid-cols-5 gap-2 overflow-x-auto pb-2 lg:pb-0 lg:overflow-visible scrollbar-hide">
          {questions.map((q, idx) => {
            const answer = answers[idx];
            const isRevealed = revealed[idx];
            const isCurrent = idx === currentIndex;
            
            let bg = "bg-natural-100 text-natural-muted";
            if (answer !== null) {
              if (answer === 'SKIPPED') {
                bg = "bg-natural-300 text-white";
              } else if (isRevealed) {
                bg = answer === q.correctAlternative ? "bg-emerald-500 text-white" : "bg-rose-500 text-white";
              } else {
                bg = "bg-sky-500 text-white"; // Neutral/Answered state (Blue)
              }
            }

            return (
              <button 
                key={idx}
                onClick={() => onJump(idx)}
                className={`flex-shrink-0 w-10 h-10 lg:w-full lg:aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:scale-105 active:scale-95 ${bg} ${isCurrent ? 'ring-4 ring-natural-600 ring-offset-2 z-10' : ''}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div className="hidden lg:grid grid-cols-1 gap-2 pt-2 border-t border-natural-100">
          <LegendItem color="bg-emerald-500" label="CORRETA" />
          <LegendItem color="bg-rose-500" label="ERRADA" />
          <LegendItem color="bg-sky-500" label="OCULTA" />
          <LegendItem color="bg-natural-100 border border-natural-200" label="PENDENTE" />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[8px] font-black tracking-tighter text-natural-muted">
      <div className={`w-2 h-2 rounded-sm ${color}`} /> {label}
    </div>
  );
}

function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
      <div className="relative">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-20 h-20 border-4 border-natural-200 border-t-natural-600 rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center text-natural-600">
          <Dna size={32} />
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-2xl font-black text-natural-900">Gerando Simulado...</h3>
        <p className="text-natural-muted max-w-sm mx-auto font-medium">Nossa IA está preparando casos clínicos complexos e questões exclusivas baseadas no tema escolhido.</p>
      </div>
    </div>
  );
}

function QuizView({ test, points, onAnswer, onConfirm, onToggleMarker, onSkip, onEliminate, onGuaranteed, onReveal, onNext, eliminated }: { 
  test: any; 
  points: number;
  onAnswer: (id: string) => void; 
  onConfirm: () => void;
  onToggleMarker: (altId: string, marker: 'doubt' | 'discard') => void;
  onSkip: () => void;
  onEliminate: () => void;
  onGuaranteed: () => void;
  onReveal: () => void;
  onNext: () => void;
  eliminated: string[];
}) {
  const currentQ = test.questions[test.currentIndex];
  const progress = ((test.currentIndex) / test.questions.length) * 100;
  const userAnswer = test.answers[test.currentIndex];
  const tempSelected = test.tempSelectedAnswer;
  const isRevealed = test.revealed[test.currentIndex];
  const isAnswered = userAnswer !== null;
  const activeAnswer = userAnswer || tempSelected;
  const currentMarkers = test.markers[test.currentIndex] || {};

  return (
    <motion.div 
      key={test.currentIndex}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-6"
    >
      <div className="space-y-3">
        <div className="flex justify-between items-center text-natural-muted font-bold text-xs uppercase tracking-widest">
           <div className="flex items-center gap-2">
              <span>Questão {test.currentIndex + 1} de {test.questions.length}</span>
              {currentQ.origin && (
                <span className="bg-natural-100 text-natural-500 px-2 py-0.5 rounded text-[8px] border border-natural-200 normal-case font-medium">
                  {currentQ.origin} {currentQ.metadata?.year ? `• ${currentQ.metadata.year}` : ''}
                </span>
              )}
           </div>
           <span className="bg-natural-200 px-2 py-0.5 rounded text-[10px] text-natural-600">{currentQ.difficulty}</span>
        </div>
        <div className="h-1.5 w-full bg-natural-200 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-natural-600"
          />
        </div>
      </div>

      <div className="medical-card p-10 bg-white min-h-[160px] flex items-center relative overflow-hidden border-b-8 border-b-natural-200">
        <p className="relative z-10 leading-relaxed font-serif text-2xl text-natural-900">{currentQ.enunciado}</p>
        <HelpCircle size={120} className="absolute -right-8 -bottom-8 text-natural-100/50 rotate-12" />
      </div>

      <div className="space-y-3">
        {currentQ.alternatives.map((alt: any) => {
          const isEliminated = eliminated.includes(alt.id);
          const isUserSelection = activeAnswer === alt.id;
          const isCorrect = alt.id === currentQ.correctAlternative;
          const marker = currentMarkers[alt.id];
          
          let stateClass = "";
          if (isRevealed) {
            if (isCorrect) stateClass = "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20";
            else if (isUserSelection) stateClass = "border-rose-500 bg-rose-50 ring-2 ring-rose-500/20";
          } else if (isUserSelection) {
            stateClass = "border-natural-600 bg-natural-50 ring-2 ring-natural-600/20 shadow-md";
          }

          if (marker === 'discard') stateClass += " opacity-50";

          return (
            <div key={alt.id} className="space-y-1">
              <div className="flex gap-2 items-stretch">
                <button
                  disabled={isEliminated || (isAnswered && !isRevealed)}
                  onClick={() => onAnswer(alt.id)}
                  className={`alternative-btn group flex-1 ${isEliminated ? 'eliminated' : ''} ${stateClass}`}
                >
                  <span className={`alt-letter ${isEliminated ? 'bg-natural-300 text-natural-muted' : isRevealed && isCorrect ? 'bg-emerald-500 text-white' : isRevealed && isUserSelection ? 'bg-rose-500 text-white' : isUserSelection ? 'bg-natural-600 text-white' : ''}`}>
                    {alt.id}
                  </span>
                  <span className={`text-base flex-1 text-left ${isEliminated || marker === 'discard' ? 'line-through text-natural-400' : 'font-medium'}`}>
                    {alt.text}
                    {marker === 'doubt' && <span className="ml-2 text-amber-500 font-bold">(Dúvida?)</span>}
                  </span>
                  {isRevealed && isCorrect && <CheckCircle2 size={18} className="text-emerald-500 ml-auto" />}
                  {isRevealed && !isCorrect && isUserSelection && <XCircle size={18} className="text-rose-500 ml-auto" />}
                </button>

                {!isAnswered && (
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => onToggleMarker(alt.id, 'doubt')}
                      className={`p-2 rounded-lg border transition-all ${marker === 'doubt' ? 'bg-amber-100 border-amber-300 text-amber-600' : 'bg-white border-natural-200 text-natural-300 hover:text-amber-400'}`}
                      title="Estou na dúvida se é essa"
                    >
                      <HelpCircle size={16} />
                    </button>
                    <button 
                      onClick={() => onToggleMarker(alt.id, 'discard')}
                      className={`p-2 rounded-lg border transition-all ${marker === 'discard' ? 'bg-rose-100 border-rose-300 text-rose-600' : 'bg-white border-natural-200 text-natural-300 hover:text-rose-400'}`}
                      title="Tenho certeza que não é essa"
                    >
                      <Eraser size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              <AnimatePresence>
                {isRevealed && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-12 pr-4 py-2 text-xs">
                      <p className={`leading-relaxed italic ${isCorrect ? 'text-emerald-700 font-medium' : 'text-natural-muted'}`}>
                        {alt.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 mt-8">
        {!isAnswered ? (
          <div className="space-y-4">
            <button 
              disabled={!tempSelected}
              onClick={onConfirm}
              className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${tempSelected ? 'bg-natural-900 text-white hover:bg-black hover:scale-[1.02] active:scale-95' : 'bg-natural-200 text-natural-400 cursor-not-allowed'}`}
            >
              Confirmar Resposta <CheckCircle2 size={24} />
            </button>

             <div className="grid grid-cols-3 gap-3">
              <FacilityButton icon={SkipForward} label="Pular" cost={3} points={points} onClick={onSkip} color="text-sky-600" />
              <FacilityButton icon={Eraser} label="Eliminar" cost={10} points={points} onClick={onEliminate} color="text-rose-500" used={eliminated.length > 0} />
              <FacilityButton icon={ShieldCheck} label="Seguro" cost={20} points={points} onClick={onGuaranteed} color="text-indigo-600" active={test.activeGuaranteed} />
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            {!isRevealed && userAnswer !== 'SKIPPED' && (
              <button onClick={onReveal} className="btn-secondary flex-1 py-4 flex items-center justify-center gap-2">
                <Search size={18} /> Ver Resposta Correta
              </button>
            )}
            <button onClick={onNext} className="btn-primary flex-1 py-4 flex items-center justify-center gap-2">
              Próxima Questão <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function FacilityButton({ icon: Icon, label, cost, points, onClick, color, used, active }: { icon: any; label: string; cost: number; points: number; onClick: () => void; color: string; used?: boolean; active?: boolean }) {
  const canAfford = points >= cost;
  return (
    <button 
      disabled={!canAfford || used}
      onClick={onClick} 
      className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all relative overflow-hidden group ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : used ? 'bg-natural-100 border-natural-200 opacity-60' : 'bg-white border-natural-200 hover:border-natural-400'}`}
    >
      <Icon size={20} className={active ? 'text-white' : used ? 'text-natural-300' : color} />
      <div className="text-center">
        <span className="text-[10px] font-black uppercase tracking-tighter block">{label}</span>
        <span className={`text-[10px] font-mono font-bold ${!canAfford && !active ? 'text-rose-500' : ''}`}>
          {used ? 'USADO' : active ? 'ATIVO' : `${cost} pts`}
        </span>
      </div>
      {!canAfford && !active && !used && (
        <div className="absolute inset-0 bg-rose-50/10 flex items-center justify-center backdrop-blur-[1px]">
          <div className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded rotate-[-15deg]">PONTOS INSUFICIENTES</div>
        </div>
      )}
    </button>
  );
}

function ResultView({ result, onHome, onReview }: { result: TestResult; onHome: () => void; onReview: () => void }) {
  const correct = result.pointsEarned;
  const total = result.questions.length;
  const skipped = result.userAnswers.filter(a => a === 'SKIPPED').length;
  const wrong = total - correct - skipped;
  const pct = Math.round((correct / total) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 text-center"
    >
      <div className="medical-card p-10 space-y-8 border-natural-200 bg-white shadow-xl">
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-natural-900 tracking-tight">Análise de Desempenho</h2>
          <p className="text-natural-muted font-medium uppercase tracking-widest text-xs">Simulado: {result.theme}</p>
        </div>

        <div className="relative inline-flex items-center justify-center group">
          <svg className="w-40 h-40 transform -rotate-90">
            <circle className="text-natural-100" strokeWidth="10" stroke="currentColor" fill="transparent" r="70" cx="80" cy="80" />
            <circle className="text-natural-600" strokeWidth="10" strokeDasharray={440} strokeDashoffset={440 - (440 * pct) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="70" cx="80" cy="80" />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-black text-natural-900">{pct}%</span>
            <span className="text-[10px] font-bold text-natural-muted uppercase tracking-tighter">Aproveitamento</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Acertos</p>
            <p className="text-2xl font-black text-emerald-700">{correct}</p>
          </div>
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
            <p className="text-[10px] font-bold text-rose-600 uppercase mb-1">Erros</p>
            <p className="text-2xl font-black text-rose-700">{wrong}</p>
          </div>
          <div className="p-4 bg-natural-100 rounded-2xl border border-natural-200">
            <p className="text-[10px] font-bold text-natural-muted uppercase mb-1">Puladas</p>
            <p className="text-2xl font-black text-natural-800">{skipped}</p>
          </div>
        </div>

        {result.categoryPerformance && (
          <div className="text-left bg-natural-50 p-6 rounded-2xl border border-natural-200 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-natural-muted">Desempenho por Categoria</h3>
            <CategoryStatsGrid stats={result.categoryPerformance} />
          </div>
        )}

        <div className="bg-natural-50 p-6 rounded-2xl border border-natural-200 space-y-4 text-left">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-natural-muted">Pontos da Sessão</span>
            <span className="text-xl font-black text-natural-600">+{result.pointsEarned} pts</span>
          </div>
          <div className="h-px bg-natural-200" />
          <div className="flex justify-between items-center font-bold">
            <span className="text-natural-900">Novo Saldo Total</span>
            <span className="text-2xl text-accent-orange font-black font-mono">{result.scoreAfter}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button onClick={onReview} className="btn-primary w-full flex items-center justify-center gap-2">
          <LayoutDashboard size={20} />
          Revisar Questões
        </button>
        <button onClick={onHome} className="btn-secondary w-full">
          Voltar para o Início
        </button>
      </div>
    </motion.div>
  );
}

function ErrorLogView({ 
  errorLog, 
  onBack, 
  onRedo, 
  onRedoSimilar,
  onUpdateObservation, 
  onRemove, 
  onMarkRevised 
}: { 
  errorLog: ErrorLogEntry[]; 
  onBack: () => void; 
  onRedo: (filter?: { category?: string }) => void;
  onRedoSimilar: (filter?: { category?: string }) => void;
  onUpdateObservation: (id: string, obs: string) => void;
  onRemove: (id: string) => void;
  onMarkRevised: (id: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [showRevised, setShowRevised] = useState(false);
  const [selectedError, setSelectedError] = useState<ErrorLogEntry | null>(null);

  const filtered = errorLog.filter(e => {
    if (!showRevised && e.isRevised) return false;
    const matchesSearch = e.question.enunciado.toLowerCase().includes(filter.toLowerCase()) || 
                          e.question.theme.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = categoryFilter === 'Todas' || e.question.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Todas', 'Clínica Médica', 'Cirurgia', 'Ginecologia e Obstetrícia', 'Pediatria', 'Saúde Coletiva'];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-natural-200 rounded-lg transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-black text-natural-900 tracking-tight uppercase">Caderno de Erros</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button 
              onClick={() => onRedoSimilar(categoryFilter !== 'Todas' ? { category: categoryFilter } : undefined)}
              className="btn-primary bg-emerald-600 border-emerald-700 hover:bg-emerald-700 font-sans px-6 py-3 flex items-center gap-2 text-[11px]"
            >
              <Zap size={16} /> Reforço Similares
            </button>
            <button 
              onClick={() => onRedo(categoryFilter !== 'Todas' ? { category: categoryFilter } : undefined)}
              className="btn-primary px-6 py-3 flex items-center gap-2 text-[11px]"
            >
              <RotateCcw size={16} /> Refazer Erros
            </button>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-6">
          <div className="medical-card p-6 bg-white border-natural-200 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-natural-400" size={16} />
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-natural-200 text-sm outline-none focus:ring-2 focus:ring-natural-600 transition-all"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-natural-muted uppercase tracking-widest">Filtrar Categoria</label>
              <div className="flex flex-wrap md:flex-col gap-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-left px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${categoryFilter === cat ? 'bg-natural-600 text-white' : 'bg-white text-natural-600 hover:bg-natural-50 border border-natural-100 md:border-none'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-natural-100">
              <button 
                onClick={() => setShowRevised(!showRevised)}
                className={`w-full py-2 px-3 rounded-lg text-[10px] font-black uppercase transition-all mb-4 border ${showRevised ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-natural-400 border-natural-100'}`}
              >
                {showRevised ? 'Ocultar Revisados' : 'Mostrar Revisados'}
              </button>

              <p className="text-[10px] font-bold text-natural-muted uppercase mb-2">Resumo</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-natural-50 p-2 rounded-xl border border-natural-200 text-center">
                  <p className="text-lg font-black text-natural-600">{errorLog.length}</p>
                  <p className="text-[8px] font-bold text-natural-muted uppercase">Total</p>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 text-center">
                  <p className="text-lg font-black text-emerald-600">{errorLog.filter(e => e.isRevised).length}</p>
                  <p className="text-[8px] font-bold text-emerald-600 uppercase">Revisados</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          {filtered.length > 0 ? (
            filtered.map(err => (
              <div key={err.id} className="medical-card p-6 bg-white border-natural-200 hover:border-natural-400 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-natural-100 text-natural-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                    {err.question.category}
                  </span>
                  <div className="flex items-center gap-2">
                    {err.isRevised && <Check size={14} className="text-emerald-500" />}
                    <span className="text-[10px] font-bold text-natural-muted uppercase">{new Date(err.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <p className="text-base font-serif text-natural-800 mb-6 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                  {err.question.enunciado}
                </p>

                {err.personalObservation && (
                  <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 italic text-[11px] text-amber-700">
                    <MessageSquare size={16} className="shrink-0" />
                    <p>{err.personalObservation}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-natural-100">
                  <button 
                    onClick={() => setSelectedError(err)}
                    className="text-[10px] font-black text-natural-600 hover:underline uppercase tracking-widest"
                  >
                    Ver Detalhes & Anotar
                  </button>
                  <button 
                    onClick={() => onMarkRevised(err.id)}
                    className={`ml-auto px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${err.isRevised ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-natural-200 text-natural-400 hover:border-emerald-500 hover:text-emerald-500'}`}
                  >
                    {err.isRevised ? 'REVISADO' : 'MARCAR REVISÃO'}
                  </button>
                  <button 
                    onClick={() => onRemove(err.id)}
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-natural-200 text-natural-muted">
              <BookOpen size={48} className="mx-auto mb-4 opacity-5" />
              <p className="font-bold">Nenhuma questão encontrada.</p>
              <p className="text-xs uppercase tracking-widest">Os erros dos seus simulados aparecerão aqui.</p>
            </div>
          )}
        </section>
      </div>

      {/* Observation Modal */}
      <AnimatePresence>
        {selectedError && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-natural-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-4 border-b border-natural-100 flex justify-between items-center bg-natural-50">
                <h3 className="font-black text-natural-900 uppercase tracking-tight">Detalhes do Erro</h3>
                <button onClick={() => setSelectedError(null)} className="p-2 hover:bg-natural-200 rounded-full transition-colors">
                  <XCircle size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="space-y-4">
                  <span className="text-[10px] font-black bg-natural-100 px-2 py-1 rounded text-natural-600 uppercase tracking-widest">Enunciado</span>
                  <p className="text-base font-serif leading-relaxed text-natural-900">{selectedError.question.enunciado}</p>
                </div>

                <div className="space-y-3">
                   <div className="flex gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl items-start shadow-sm">
                     <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                     <div className="flex-1 overflow-hidden">
                       <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Gabarito: Alternativa {selectedError.question.correctAlternative}</p>
                       <p className="text-sm font-medium text-emerald-800 break-words">
                         {selectedError.question.alternatives.find(a => a.id === selectedError.question.correctAlternative)?.text}
                       </p>
                     </div>
                   </div>
                   <div className="flex gap-2 p-4 bg-rose-50 border border-rose-100 rounded-2xl items-start shadow-sm">
                     <XCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                     <div className="flex-1 overflow-hidden">
                       <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Sua Resposta: {selectedError.userAnswer || 'PULADA'}</p>
                       <p className="text-sm font-medium text-rose-800 break-words">
                         {selectedError.userAnswer ? selectedError.question.alternatives.find(a => a.id === selectedError.userAnswer)?.text : 'Você pulou esta questão.'}
                       </p>
                     </div>
                   </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-natural-muted uppercase tracking-widest flex items-center gap-2">
                    <Edit size={14} /> Observação Pessoal
                  </label>
                  <textarea 
                    value={selectedError.personalObservation || ''}
                    onChange={(e) => onUpdateObservation(selectedError.id, e.target.value)}
                    placeholder="Anote aqui por que errou ou um lembrete importante..."
                    className="w-full h-32 p-4 rounded-2xl border border-natural-200 outline-none focus:ring-2 focus:ring-natural-600 transition-all text-sm resize-none bg-natural-50/50"
                  />
                </div>
              </div>
              <div className="p-4 bg-natural-50 border-t border-natural-100 flex justify-end">
                <button onClick={() => setSelectedError(null)} className="btn-primary px-8 py-3 uppercase text-xs font-black">Salvar & Fechar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ShopView({ points, onBack, onBuy }: { points: number; onBack: () => void; onBuy: (cost: number) => void }) {
  const items = [
    { id: 'extra_points', title: 'Pacote de Emergência', description: 'Ganha 50 pontos extras para usar em simulados (Uso Único)', cost: 0, icon: <Zap />, disabled: true },
    { id: 'theme_unlock', title: 'Tema Especializado', description: 'Desbloqueia temas exclusivos de provas passadas (Permanente)', cost: 100, icon: <Dna /> },
    { id: 'shield_pro', title: 'Escudo Pro', description: 'Primeira questão errada de cada teste não desconta pontos (Uso Único)', cost: 50, icon: <ShieldCheck /> },
    { id: 'double_xp', title: 'XP em Dobro', description: 'Ganha o dobro de XP no próximo simulado realizado (Uso Único)', cost: 40, icon: <Trophy /> }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-natural-200 rounded-lg transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-natural-900 tracking-tight uppercase">Loja de Recursos</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map(item => (
          <div key={item.id} className="medical-card p-6 bg-white border-natural-200 flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
               {item.icon}
            </div>
            <div>
              <h4 className="font-black text-natural-900 uppercase tracking-tight text-sm">{item.title}</h4>
              <p className="text-[9px] font-bold text-natural-muted uppercase h-10 overflow-hidden leading-tight mt-1">{item.description}</p>
            </div>
            <div className="pt-4 border-t border-natural-100 w-full">
              <button 
                disabled={item.disabled || points < item.cost}
                onClick={() => onBuy(item.cost)}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase transition-all ${item.disabled ? 'bg-natural-100 text-natural-300' : points >= item.cost ? 'bg-amber-500 text-white shadow-lg hover:translate-y-[-2px] active:scale-95' : 'bg-natural-100 text-natural-400'}`}
              >
                {item.disabled ? 'EM BREVE' : `${item.cost} PONTOS`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ProfileView({ gamification, history, errorLog, stats, onBack, onSettings }: { gamification: any; history: any[]; errorLog: any[]; stats: CategoryStats[]; onBack: () => void; onSettings: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-natural-200 rounded-lg transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-black text-natural-900 tracking-tight uppercase">Seu Perfil</h2>
        </div>
        <button 
          onClick={onSettings}
          className="p-2 hover:bg-natural-200 rounded-lg transition-colors text-natural-600 flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest border border-natural-200"
        >
          <Settings size={20} /> Configurações
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-8">
          {/* Level Header */}
          <div className="medical-card p-8 bg-gradient-to-br from-natural-600 to-natural-800 text-white overflow-hidden relative shadow-xl">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center border-4 border-white/40 shadow-xl">
                  <Award size={40} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black uppercase tracking-tight">Nível {gamification.level}</h3>
                  <p className="text-white/60 font-bold uppercase tracking-widest text-[10px]">Evolução do Estudante</p>
                </div>
              </div>
              
              <div className="space-y-2">
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                   <span>Progresso para Nível {gamification.level + 1}</span>
                   <span>{gamification.xp % 100} / 100 XP</span>
                 </div>
                 <div className="h-4 w-full bg-black/20 rounded-full border border-white/20 overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${gamification.xp % 100}%` }}
                      className="h-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                    />
                 </div>
              </div>
            </div>
            <Dna size={180} className="absolute -right-16 -bottom-16 text-white/5 rotate-12" />
          </div>

          <div className="space-y-6">
            <h3 className="font-black text-natural-900 uppercase tracking-widest text-xs flex items-center gap-2">
              <LayoutDashboard size={18} /> Histórico por Categoria
            </h3>
            <CategoryStatsGrid stats={stats} />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="medical-card p-6 bg-white border-natural-200 space-y-6 shadow-sm">
            <h3 className="font-black text-natural-900 uppercase tracking-widest text-xs border-b border-natural-100 pb-3">Resumo Geral</h3>
            
            <StatItem label="Testes Realizados" value={history.length} icon={<LayoutDashboard size={14} />} />
            <StatItem label="Questões no Caderno" value={errorLog.length} icon={<BookOpen size={14} />} />
            <StatItem label="Combo Atual" value={`${gamification.currentStreak} dias`} icon={<Flame size={14} />} />
            <StatItem label="XP Total" value={gamification.xp} icon={<Trophy size={14} />} />
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function SettingsView({ 
  onBack, 
  onDeleteHistory, 
  onResetPoints,
  onResetStats,
  onResetCombo,
  onResetGamification
}: { 
  onBack: () => void; 
  onDeleteHistory: () => void; 
  onResetPoints: () => void;
  onResetStats: () => void;
  onResetCombo: () => void;
  onResetGamification: () => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-natural-200 rounded-lg transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-natural-900 tracking-tight uppercase">Configurações</h2>
      </div>

      <div className="space-y-6">
        <div className="medical-card p-6 bg-white border-natural-200 space-y-6">
          <h3 className="font-black text-natural-900 uppercase tracking-widest text-xs flex items-center gap-2">
             Gerenciamento de Dados
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reset History */}
            <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/30 space-y-4 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0">
                  <History size={16} />
                </div>
                <div>
                  <h4 className="font-black text-natural-900 uppercase tracking-tight text-[10px]">Histórico de Testes</h4>
                  <p className="text-[10px] text-natural-muted mt-1 leading-tight">Zera todos os simulados e caderno de erros.</p>
                </div>
              </div>
              <button onClick={onDeleteHistory} className="w-full py-2 bg-white border border-rose-200 text-rose-600 rounded-lg font-black text-[10px] uppercase hover:bg-rose-600 hover:text-white transition-all">
                Apagar Histórico
              </button>
            </div>

            {/* Reset Points */}
            <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/30 space-y-4 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0">
                  <Trophy size={16} />
                </div>
                <div>
                  <h4 className="font-black text-natural-900 uppercase tracking-tight text-[10px]">Pontuação Revalida</h4>
                  <p className="text-[10px] text-natural-muted mt-1 leading-tight">Zera seu saldo atual de pontos.</p>
                </div>
              </div>
              <button onClick={onResetPoints} className="w-full py-2 bg-white border border-rose-200 text-rose-600 rounded-lg font-black text-[10px] uppercase hover:bg-rose-600 hover:text-white transition-all">
                Resetar Pontos
              </button>
            </div>

            {/* Reset Stats */}
            <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/30 space-y-4 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0">
                  <BarChart3 size={16} />
                </div>
                <div>
                  <h4 className="font-black text-natural-900 uppercase tracking-tight text-[10px]">Estatísticas de Categoria</h4>
                  <p className="text-[10px] text-natural-muted mt-1 leading-tight">Zera métricas acumuladas por especialidade.</p>
                </div>
              </div>
              <button onClick={onResetStats} className="w-full py-2 bg-white border border-rose-200 text-rose-600 rounded-lg font-black text-[10px] uppercase hover:bg-rose-600 hover:text-white transition-all">
                Resetar Estatísticas
              </button>
            </div>

            {/* Reset Combo */}
            <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/30 space-y-4 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0">
                  <Flame size={16} />
                </div>
                <div>
                  <h4 className="font-black text-natural-900 uppercase tracking-tight text-[10px]">Combo (Streak)</h4>
                  <p className="text-[10px] text-natural-muted mt-1 leading-tight">Zera seu combo atual de dias.</p>
                </div>
              </div>
              <button onClick={onResetCombo} className="w-full py-2 bg-white border border-rose-200 text-rose-600 rounded-lg font-black text-[10px] uppercase hover:bg-rose-600 hover:text-white transition-all">
                Resetar Combo
              </button>
            </div>

            {/* Reset Gamification */}
            <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/30 space-y-4 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0">
                  <Award size={16} />
                </div>
                <div>
                  <h4 className="font-black text-natural-900 uppercase tracking-tight text-[10px]">Nível e XP</h4>
                  <p className="text-[10px] text-natural-muted mt-1 leading-tight">Volta ao Nível 1 e zera o XP total.</p>
                </div>
              </div>
              <button onClick={onResetGamification} className="w-full py-2 bg-white border border-rose-200 text-rose-600 rounded-lg font-black text-[10px] uppercase hover:bg-rose-600 hover:text-white transition-all">
                Resetar Nível e XP
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-2xl flex gap-4 text-amber-800">
          <AlertTriangle size={24} className="shrink-0" />
          <div className="space-y-1">
            <h4 className="font-black uppercase tracking-tight text-xs">Cuidado!</h4>
            <p className="text-[11px] leading-relaxed font-medium">
              Estas ações são irreversíveis. Uma vez confirmada a exclusão, os dados não poderão ser recuperados. 
              Pense bem antes de prosseguir com a limpeza.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatItem({ label, value, icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[10px] font-bold text-natural-muted uppercase tracking-widest">
        <span className="text-natural-400">{icon}</span>
        {label}
      </div>
      <div className="text-sm font-black text-natural-900">{value}</div>
    </div>
  );
}

function ReviewView({ result, onBack, onContest }: { result: TestResult; onBack: () => void; onContest: (q: Question, idx: number) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4 sticky top-[72px] bg-natural-100/80 backdrop-blur-md py-4 z-40">
        <button onClick={onBack} className="p-2 hover:bg-natural-200 rounded-lg transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold">Revisão Detalhada</h2>
      </div>

      <div className="space-y-12 pb-20">
        {result.questions.map((q, idx) => {
          const userAnswer = result.userAnswers[idx];
          const isCorrect = userAnswer === q.correctAlternative;
          const isSkipped = userAnswer === 'SKIPPED';
          const contestation = result.contestedQuestions?.find(c => c.questionId === q.id);

          return (
            <div key={q.id} className="space-y-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-natural-200 text-natural-muted text-[10px] font-bold uppercase rounded-md tracking-widest">Questão {idx + 1} • {q.difficulty}</span>
                  {q.origin && (
                    <span className="px-2 py-1 bg-natural-100 text-natural-400 text-[8px] font-medium rounded-md border border-natural-200">
                      {q.origin} {q.metadata?.year ? `(${q.metadata.year})` : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isSkipped ? (
                    <span className="bg-natural-300 text-natural-muted px-3 py-1 rounded-full text-[10px] font-bold uppercase">Pulada</span>
                  ) : isCorrect ? (
                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                      <CheckCircle2 size={14} /> Acerto
                    </span>
                  ) : (
                    <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                      <XCircle size={14} /> Erro
                    </span>
                  )}

                  {!contestation ? (
                    <button 
                      onClick={() => onContest(q, idx)}
                      className="flex items-center gap-1 px-3 py-1 bg-white border border-natural-200 text-natural-600 rounded-full text-[10px] font-bold uppercase hover:bg-natural-50 transition-all shadow-sm"
                    >
                      <Scale size={14} /> Contestar
                    </button>
                  ) : (
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${contestation.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : contestation.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {contestation.status === 'accepted' && <Award size={14} />}
                      {contestation.status === 'rejected' && <AlertTriangle size={14} />}
                      {contestation.status === 'pending' && <Clock size={14} />}
                      {contestation.status === 'accepted' ? 'INVALIDADA' : contestation.status === 'rejected' ? 'REJEITADA' : 'EM REVISÃO'}
                    </div>
                  )}
                </div>
              </div>
              
              {contestation && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl border ${contestation.status === 'accepted' ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-600/5 shadow-lg' : 'bg-rose-50 border-rose-200 text-rose-900 shadow-rose-600/5 shadow-lg'} space-y-2`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare size={14} /> Parecer Técnico da Banca
                  </p>
                  <p className="text-xs font-medium leading-relaxed italic">"{contestation.aiFeedback}"</p>
                  {contestation.status === 'accepted' && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-200 text-emerald-700 font-black text-[10px] uppercase tracking-tighter">
                      <Trophy size={14} /> +1 Ponto creditado por revisão técnica
                    </div>
                  )}
                </motion.div>
              )}
              
              <div className="medical-card p-8 bg-white border-b-2 border-natural-200">
                <p className="text-natural-900 font-serif text-lg leading-relaxed">{q.enunciado}</p>
              </div>

              <div className="space-y-3">
                {q.alternatives.map(alt => {
                  const isCorrectAlt = alt.id === q.correctAlternative;
                  const isUserSelection = alt.id === userAnswer;
                  
                  let borderClass = "border-natural-200";
                  let bgClass = "bg-white";
                  let icon = null;

                  if (isCorrectAlt) {
                    borderClass = "border-natural-600";
                    bgClass = "bg-natural-50";
                    icon = <CheckCircle2 size={16} className="text-natural-600" />;
                  } else if (isUserSelection && !isCorrect) {
                    borderClass = "border-rose-400";
                    bgClass = "bg-rose-50";
                    icon = <XCircle size={16} className="text-rose-500" />;
                  }

                  const markers = result.auxiliaryMarkers?.[idx] || {};
                  const marker = markers[alt.id];

                  return (
                    <div key={alt.id} className="space-y-2">
                       <div className={`p-4 rounded-xl border transition-all flex items-start gap-4 ${bgClass} ${borderClass} ${isCorrectAlt ? 'shadow-[0_0_15px_rgba(90,111,90,0.1)]' : ''} ${marker === 'discard' ? 'opacity-50' : ''}`}>
                        <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${isCorrectAlt ? 'bg-natural-600 text-white' : 'bg-natural-100 text-natural-muted'}`}>{alt.id}</span>
                        <span className={`text-natural-800 pt-0.5 text-base leading-relaxed flex-1 ${marker === 'discard' ? 'line-through' : ''}`}>
                          {alt.text}
                          {marker === 'doubt' && <span className="ml-2 text-amber-500 font-bold text-[10px]">(Dúvida anotada)</span>}
                        </span>
                        {icon}
                      </div>
                      <div className="pl-12 pr-4 text-xs">
                        <span className="block font-bold text-natural-muted mb-1 uppercase tracking-tighter text-[9px]">Comentário:</span>
                        <p className={`leading-relaxed italic ${isCorrectAlt ? 'text-natural-600' : 'text-natural-muted'}`}>{alt.explanation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function HistoryView({ history, onBack, onReview }: { history: TestResult[]; onBack: () => void; onReview: (res: TestResult) => void }) {
  const [search, setSearch] = useState('');

  const filtered = history.filter(h => 
    h.theme.toLowerCase().includes(search.toLowerCase()) ||
    new Date(h.date).toLocaleDateString().includes(search)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold">Histórico de Testes</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-natural-muted" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar por tema, data..." 
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-natural-200 outline-none focus:ring-2 focus:ring-natural-600/10 transition-all bg-white text-natural-900"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map((res) => {
            const pct = Math.round((res.pointsEarned / (res.questions?.length || 1)) * 100);
            
            let colorClass = "border-b-rose-500 bg-rose-50/30";
            let badgeClass = "bg-rose-100 text-rose-700";
            let textColor = "text-rose-900";
            
            if (pct >= 60) {
              colorClass = "border-b-emerald-500 bg-emerald-50/30";
              badgeClass = "bg-emerald-100 text-emerald-700";
              textColor = "text-emerald-900";
            } else if (pct >= 50) {
              colorClass = "border-b-amber-500 bg-amber-50/30";
              badgeClass = "bg-amber-100 text-amber-700";
              textColor = "text-amber-900";
            }

            return (
              <div 
                key={res.id} 
                onClick={() => onReview(res)} 
                className={`medical-card p-6 h-fit hover:translate-y-[-2px] cursor-pointer transition-all border-b-4 ${colorClass}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <h4 className={`font-black uppercase tracking-tight text-lg ${textColor}`}>{res.theme}</h4>
                    <p className="text-[10px] font-bold text-natural-muted flex items-center gap-1 uppercase tracking-widest">
                      <Clock size={12} />
                      {new Date(res.date).toLocaleDateString('pt-BR')} às {new Date(res.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-sm font-black font-mono shadow-sm ${badgeClass}`}>
                    {pct}%
                  </div>
                </div>

                {res.categoryPerformance && (
                  <div className="mt-4 mb-6 p-4 bg-white/50 rounded-xl border border-natural-200/50">
                    <CategoryStatsGrid stats={res.categoryPerformance} />
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-xs font-bold text-natural-muted border-t border-natural-200/50 pt-4">
                  <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-600" /> {res.pointsEarned}</span>
                  <span className="flex items-center gap-1"><XCircle size={14} className="text-rose-500" /> {res.questions.length - res.pointsEarned}</span>
                  <span className={`ml-auto font-black flex items-center gap-1 font-mono text-sm ${pct >= 60 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-rose-700'}`}>+{res.pointsEarned} pts</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-natural-200 text-natural-muted">
            <LayoutDashboard size={48} className="mx-auto mb-4 opacity-5" />
            <p className="font-medium">Nenhum simulado no histórico.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MissionsCenterView({ missions, onBack, onClaim }: { missions: Mission[]; onBack: () => void; onClaim: (id: string) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-3xl mx-auto"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-natural-200 rounded-lg transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-natural-900 tracking-tight uppercase">Centro de Missões</h2>
      </div>

      <div className="grid gap-4">
        {(missions || []).map(mission => (
          <div key={mission.id} className={`medical-card p-6 bg-white border-2 transition-all ${mission.completed ? 'border-emerald-200 bg-emerald-50/20' : 'border-natural-200'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                   <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${mission.type === 'daily' ? 'bg-sky-100 text-sky-700' : 'bg-purple-100 text-purple-700'}`}>
                     {mission.type === 'daily' ? 'Diária' : 'Semanal'}
                   </span>
                   {mission.completed && <CheckCircle2 size={14} className="text-emerald-500" />}
                </div>
                <h3 className="text-base font-black text-natural-900 uppercase tracking-tight">{mission.title}</h3>
                <p className="text-xs text-natural-muted font-medium">{mission.description}</p>
              </div>
              <div className="text-right space-y-1">
                 <p className="text-[10px] font-black text-natural-400 uppercase tracking-widest">Recompensa</p>
                 <div className="flex gap-2 justify-end">
                    {mission.reward.points && <span className="text-xs font-black text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">+{mission.reward.points} pts</span>}
                    {mission.reward.xp && <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-2 py-1 rounded-lg">+{mission.reward.xp} XP</span>}
                 </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
               <div className="flex-1 h-3 bg-natural-100 rounded-full overflow-hidden border border-natural-200">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${(mission.progress / mission.criterion.target) * 100}%` }}
                   className={`h-full ${mission.completed ? 'bg-emerald-500' : 'bg-sky-500'}`}
                 />
               </div>
               <span className="text-[10px] font-black text-natural-600">{mission.progress}/{mission.criterion.target}</span>
            </div>

            {mission.completed && (
              <button 
                onClick={() => onClaim(mission.id)}
                className="w-full mt-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                Coletar Recompensa
              </button>
            )}
          </div>
        ))}

        {(missions || []).length === 0 && (
          <div className="py-20 text-center space-y-4">
             <Target size={64} className="mx-auto text-natural-200" />
             <p className="text-natural-400 font-black uppercase tracking-widest text-sm">Todas as missões concluídas!</p>
             <p className="text-xs text-natural-muted uppercase font-bold">Volte amanhã para novos desafios.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SkillsTreeView({ skillTree, onBack }: { skillTree: SkillNode[]; onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-natural-200 rounded-lg transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-natural-900 tracking-tight uppercase">Árvore de Habilidades</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(skillTree || []).map(node => (
          <div key={node.category} className="medical-card p-6 bg-white border-2 border-natural-200 space-y-6 relative overflow-hidden group">
            <ZapIcon size={80} className="absolute -right-6 -bottom-6 text-natural-50 rotate-12 transition-transform group-hover:scale-110" />
            
            <div className="relative z-10">
               <div className="flex justify-between items-start mb-2">
                 <h3 className="text-sm font-black text-natural-900 uppercase tracking-tighter leading-none">{node.category}</h3>
                 <span className="text-[10px] font-black bg-natural-900 text-white px-2 py-1 rounded-lg">NÍVEL {node.level}</span>
               </div>
               
               <p className="text-[10px] text-natural-muted font-bold uppercase tracking-widest">{node.xp} XP de Especialidade</p>
               
               <div className="mt-4 h-2 bg-natural-100 rounded-full overflow-hidden">
                 <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(node.xp % 500) / 5}%` }}
                    className="h-full bg-purple-500"
                 />
               </div>
               
               <div className="mt-8 space-y-3">
                 <p className="text-[10px] font-black text-natural-400 uppercase tracking-widest border-b border-natural-100 pb-2">Talentos Desbloqueados</p>
                 <div className="flex flex-wrap gap-2">
                    {node.level >= 2 ? (
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1">
                        <Flashlight size={10} /> Olhar Clínico (+5% XP)
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-natural-300 bg-natural-50 border border-dotted border-natural-200 px-2 py-1 rounded-lg flex items-center gap-1">
                        <ZapOff size={10} /> Bloqueado (LVL 2)
                      </span>
                    )}
                    {node.level >= 5 ? (
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1">
                        <Crosshair size={10} /> Precisão Diagnóstica (+2 pts)
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-natural-300 bg-natural-50 border border-dotted border-natural-200 px-2 py-1 rounded-lg flex items-center gap-1">
                        <ZapOff size={10} /> Bloqueado (LVL 5)
                      </span>
                    )}
                 </div>
               </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function CollectionAlbumView({ collectedIds, onBack }: { collectedIds: string[]; onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-natural-200 rounded-lg transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-black text-natural-900 tracking-tight uppercase">Álbum de Cards Médicos</h2>
        </div>
        <div className="text-xs font-black text-natural-600 bg-natural-100 px-4 py-2 rounded-full border border-natural-200 uppercase">
           {(collectedIds || []).length}/{MEDICAL_CARDS.length} Obtidos
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {MEDICAL_CARDS.map(card => {
          const isObtained = (collectedIds || []).includes(card.id);
          return (
            <div key={card.id} className={`medical-card aspect-[2.5/3.5] p-6 bg-white border-4 transition-all relative overflow-hidden group ${isObtained ? 'border-natural-900 shadow-xl' : 'border-natural-100 grayscale opacity-40'}`}>
              {!isObtained && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-natural-50/50 backdrop-blur-[2px]">
                  <HelpCircle size={64} className="text-natural-300 animate-pulse" />
                  <p className="text-[10px] font-black text-natural-400 uppercase tracking-widest mt-2">Bloqueado</p>
                </div>
              )}
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                       <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${isObtained ? (card.rarity === 'legendary' ? 'bg-amber-100 text-amber-700' : card.rarity === 'epic' ? 'bg-purple-100 text-purple-700' : 'bg-natural-100 text-natural-600') : 'bg-natural-100 text-natural-300'}`}>
                         {isObtained ? card.rarity : '???'}
                       </span>
                       <span className="text-[10px] font-black text-natural-400">{isObtained ? card.category : 'Mistério'}</span>
                    </div>
                    <h3 className={`text-lg font-black text-natural-900 uppercase tracking-tighter leading-none break-words ${!isObtained && 'blur-sm'}`}>
                      {isObtained ? card.title : 'Card Desconhecido'}
                    </h3>
                 </div>

                 {isObtained ? (
                   <div className="space-y-4">
                     <p className="text-[10px] font-medium text-natural-700 leading-tight italic">"{card.description}"</p>
                     <div className="bg-natural-50 p-3 rounded-xl border border-natural-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-natural-400 mb-1">Curiosidade</p>
                        <p className="text-[9px] font-bold text-natural-600 leading-relaxed">{card.trivia}</p>
                     </div>
                   </div>
                 ) : (
                   <div className="flex-1 flex items-center justify-center">
                     <Lock size={24} className="text-natural-200" />
                   </div>
                 )}
              </div>

              {isObtained && card.rarity === 'legendary' && (
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-400/20 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function LuckySpinView({ onBack, onSpin, lastUsed, lastReward }: { onBack: () => void; onSpin: () => void; lastUsed: string | null; lastReward: string | null }) {
  const today = new Date().toISOString().split('T')[0];
  const canSpin = lastUsed !== today;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="space-y-12 max-w-2xl mx-auto py-12 text-center"
    >
      <div className="flex items-center gap-4 justify-center">
        <button onClick={onBack} className="p-2 hover:bg-natural-200 rounded-lg transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-natural-900 tracking-tight uppercase">Giro Diário da Sorte</h2>
      </div>

      <div className="relative w-64 h-64 mx-auto">
         <motion.div 
           animate={canSpin ? {} : { rotate: 360 * 6 + (Math.random() * 360) }}
           transition={{ duration: 4, ease: [0.15, 0, 0.15, 1] }}
           className="w-full h-full rounded-full border-8 border-natural-900 bg-gradient-to-br from-amber-400 via-amber-200 to-amber-500 shadow-2xl relative"
         >
            <div className="absolute inset-0 flex items-center justify-center">
               <Dice5 size={64} className="text-natural-900 opacity-20" />
            </div>
            {[0, 72, 144, 216, 288].map(deg => (
               <div key={deg} className="absolute top-0 left-1/2 -ml-0.5 w-1 h-32 bg-natural-900 origin-bottom transform" style={{ rotate: `${deg}deg` }} />
            ))}
         </motion.div>
         <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-10 bg-rose-600 rounded-b-full shadow-lg z-10" />
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-3xl font-black text-natural-900 uppercase tracking-tighter mb-2">
            {canSpin ? 'Você tem 1 giro grátis!' : 'Giro de Hoje Concluído'}
          </h3>
          <p className="text-sm text-natural-muted font-medium">
            {canSpin ? 'A sorte favorece quem estuda todos os dias.' : 'Você já coletou sua sorte hoje. Volte amanhã!'}
          </p>
        </div>

        {!canSpin && lastReward && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-amber-50 border-2 border-amber-200 rounded-3xl space-y-2 inline-block shadow-lg"
          >
             <p className="text-xs font-black text-amber-600 uppercase tracking-widest">Prêmio Coletado</p>
             <p className="text-4xl font-black text-amber-800 uppercase tracking-tighter">{lastReward}</p>
          </motion.div>
        )}

        {canSpin && (
          <button 
            onClick={onSpin}
            className="px-16 py-6 rounded-2xl bg-natural-900 text-white font-black text-2xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl hover:bg-black group"
          >
            <span className="flex items-center gap-4">
              Girar <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" />
            </span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-3 max-w-sm mx-auto pt-8 border-t border-natural-200 opacity-40">
         {['10 PTS', '25 PTS', 'RARO', '100 XP', '50 PTS'].map((r, i) => (
           <div key={i} className="flex flex-col items-center gap-1">
              <Gift size={20} className="text-amber-500" />
              <span className="text-[9px] font-black">{r}</span>
           </div>
         ))}
      </div>
    </motion.div>
  );
}

function ChefaoView({ onBack, studyDays, onStartBoss }: { onBack: () => void; studyDays: number; onStartBoss: (type: 'monthly' | 'weekly') => void }) {
  const canFaceBoss = studyDays >= 10;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12 max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-natural-200 rounded-lg transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-natural-900 tracking-tight uppercase">Eventos Épicos: Chefão</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!canFaceBoss ? (
            <div className="medical-card p-12 bg-natural-950 text-white text-center space-y-8 flex flex-col items-center shadow-2xl overflow-hidden relative">
              <ShieldAlert size={120} className="text-white/10 absolute -left-10 -bottom-10 rotate-12" />
              <Lock size={64} className="text-rose-500 mb-4 animate-bounce" />
              <div className="space-y-2 relative z-10">
                  <h3 className="text-3xl font-black uppercase tracking-tighter">Chefão Bloqueado</h3>
                  <p className="text-white/60 font-medium">O Chefão é liberado após 10 dias de estudo acumulados.</p>
              </div>
              
              <div className="w-full max-w-md space-y-4 relative z-10">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-1">
                    <span>Dias Válidos Acumulados</span>
                    <span>{studyDays}/10</span>
                  </div>
                  <div className="h-4 bg-white/10 rounded-full overflow-hidden border border-white/20 p-1">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(studyDays / 10) * 100}%` }}
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                    />
                  </div>
                  <p className="text-[10px] text-white/40 font-bold uppercase">Qualquer atividade (testes, revisões, missões) conta como dia válido!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="medical-card p-8 bg-natural-900 text-white space-y-6 shadow-xl border-4 border-rose-500/30 group">
                  <div className="flex justify-between items-start">
                    <span className="text-[8px] font-black bg-rose-600 px-3 py-1 rounded-full uppercase tracking-widest">Semanal</span>
                    <Trophy size={48} className="text-rose-500 opacity-20 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">O Subchefe</h3>
                    <p className="text-xs text-white/70 font-medium mt-2">Simulado de 20 questões sobre seus temas estudados nos últimos 7 dias. Dificuldade Elevada.</p>
                  </div>
                  <ul className="space-y-2 text-[10px] font-black uppercase tracking-widest text-white/50">
                    <li className="flex items-center gap-2"><Check size={12} className="text-rose-500" /> 20 Questões Hard</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-rose-500" /> +500 XP bônus</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-rose-500" /> Medalha Semanal</li>
                  </ul>
                  <button 
                    onClick={() => onStartBoss('weekly')}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase transition-all shadow-lg shadow-rose-600/30 font-sans"
                  >
                    Desafiar Subchefe
                  </button>
              </div>

              <div className="medical-card p-8 bg-black text-white space-y-6 shadow-2xl border-4 border-amber-500/50 relative overflow-hidden group">
                  <Crown size={120} className="absolute -right-10 -bottom-10 text-white/5 rotate-12" />
                  <div className="flex justify-between items-start relative z-10">
                    <span className="text-[8px] font-black bg-amber-600 px-3 py-1 rounded-full uppercase tracking-widest">Mensal Épico</span>
                    <Award size={48} className="text-amber-500 opacity-20 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">O Grande Chefão</h3>
                    <p className="text-xs text-white/70 font-medium mt-2">A prova final de 50 questões baseada nos últimos 30 dias. Apenas os revalidados vencem.</p>
                  </div>
                  <ul className="space-y-2 text-[10px] font-black uppercase tracking-widest text-white/50 relative z-10">
                    <li className="flex items-center gap-2"><Check size={12} className="text-amber-500" /> 50 Questões Hard</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-amber-500" /> +2000 XP & Medalha Única</li>
                    <li className="flex items-center gap-2"><Check size={12} className="text-amber-500" /> Card Lendário Garantido</li>
                  </ul>
                  <button 
                    onClick={() => onStartBoss('monthly')}
                    className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs uppercase transition-all shadow-lg shadow-amber-600/50 relative z-10 font-sans"
                  >
                    Enfrentar Chefão
                  </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="medical-card p-6 bg-white border-2 border-natural-200">
            <h4 className="text-xs font-black uppercase tracking-widest text-natural-900 border-b border-natural-100 pb-3 mb-4">Regras do Desafio</h4>
            <div className="space-y-4">
              <RuleItem title="Desbloqueio" text="Soma de 10 dias de estudo (resolvendo questões ou revisando)." />
              <RuleItem title="Conteúdo" text="O sistema analisa seu histórico dos últimos 7 ou 30 dias para gerar questões sobre seus temas reais." />
              <RuleItem title="Aprovação" text="Para vencer, você deve atingir pelo menos 80% de acerto. Caso contrário, o Chefão foge!" />
              <RuleItem title="Dificuldade" text="100% das questões são de nível 'Difícil' (Casos Clínicos Inep)." />
              <RuleItem title="Recompensas" text="XP Massivo, Medalhas Exclusivas e Cards Lendários para sua coleção." />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RuleItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-natural-900 uppercase tracking-tighter">{title}</p>
      <p className="text-[10px] text-natural-muted font-medium leading-tight">{text}</p>
    </div>
  );
}

function BossLock({ size, className }: { size?: number; className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ContestationModal({ isOpen, onClose, onSubmit, loading }: { isOpen: boolean; onClose: () => void; onSubmit: (type: 'automatic' | 'manual', argument?: string) => void; loading: boolean }) {
  const [type, setType] = useState<'automatic' | 'manual'>('automatic');
  const [argument, setArgument] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-natural-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-natural-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-natural-100 rounded-lg text-natural-600">
               <Scale size={20} />
             </div>
             <h3 className="text-lg font-black uppercase tracking-tight text-natural-900">Contestar Questão</h3>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 hover:bg-natural-100 rounded-full transition-colors text-natural-400">
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
             <button 
              onClick={() => setType('automatic')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 group ${type === 'automatic' ? 'border-natural-900 bg-natural-900 text-white shadow-lg' : 'border-natural-100 bg-white text-natural-400 hover:border-natural-200'}`}
             >
               <Zap size={24} className={type === 'automatic' ? 'text-amber-400' : 'text-natural-300'} />
               <div className="text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest">Automática</p>
                 <p className="text-[8px] font-bold opacity-60">IA analiza erros técnicos</p>
               </div>
             </button>
             <button 
              onClick={() => setType('manual')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 group ${type === 'manual' ? 'border-natural-900 bg-natural-900 text-white shadow-lg' : 'border-natural-100 bg-white text-natural-400 hover:border-natural-200'}`}
             >
               <Edit size={24} className={type === 'manual' ? 'text-sky-400' : 'text-natural-300'} />
               <div className="text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest">Manual</p>
                 <p className="text-[8px] font-bold opacity-60">Envie seu argumento</p>
               </div>
             </button>
          </div>

          {type === 'manual' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="space-y-2 overflow-hidden"
            >
              <label className="text-[10px] font-black text-natural-muted uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={12} /> Seu Argumento
              </label>
              <textarea 
                value={argument}
                onChange={(e) => setArgument(e.target.value)}
                placeholder="Explique tecnicamente por que esta questão deve ser invalidada..."
                className="w-full h-32 p-4 rounded-2xl border border-natural-200 text-sm outline-none focus:ring-2 focus:ring-natural-900 transition-all resize-none bg-natural-50 font-medium"
              />
            </motion.div>
          )}

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex gap-3 text-amber-800">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-[10px] font-medium leading-snug italic">
              A resposta será definitiva e baseada em evidências médicas atuais. 
              {type === 'automatic' ? ' A IA revisará se há ambiguidade na questão.' : ' A IA avaliará se seu argumento procede tecnicamente.'}
              Se aceita, você receberá a pontuação retroativa.
            </p>
          </div>
        </div>

        <div className="p-6 bg-natural-50 border-t border-natural-100 flex gap-3">
          <button 
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-4 bg-white border border-natural-200 text-natural-600 rounded-xl font-black text-xs uppercase hover:bg-natural-100 transition-all"
          >
            Cancelar
          </button>
          <button 
            disabled={loading || (type === 'manual' && argument.length < 10)}
            onClick={() => onSubmit(type, type === 'manual' ? argument : undefined)}
            className="flex-[2] py-4 bg-natural-900 text-white rounded-xl font-black text-xs uppercase hover:bg-black transition-all shadow-xl shadow-natural-900/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
                />
                Analisando Gabarito...
              </>
            ) : (
              <>Enviar Contestação <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function LoginView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-natural-100 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden border border-natural-200 p-8 text-center"
      >
        <div className="w-20 h-20 bg-natural-900 rounded-3xl flex items-center justify-center text-white font-bold text-4xl mx-auto mb-6 shadow-xl shadow-natural-900/20">
          R
        </div>
        
        <h1 className="text-2xl font-black uppercase tracking-tight text-natural-900 mb-2">REVALIDA MasterQuiz</h1>
        <p className="text-xs font-bold text-natural-muted tracking-widest uppercase mb-8">Evolução Contínua para Médicos</p>
        
        <div className="space-y-4">
          <button 
            onClick={onLogin}
            className="w-full py-4 bg-white border border-natural-200 rounded-2xl flex items-center justify-center gap-3 hover:bg-natural-50 transition-all active:scale-95 group"
          >
            <div className="w-5 h-5 flex items-center justify-center">
               <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-natural-900 group-hover:tracking-[0.15em] transition-all">Entrar com Google</span>
          </button>
          
          <div className="py-2">
            <div className="h-px bg-natural-100 w-full relative">
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[9px] font-black uppercase text-natural-300 tracking-widest">OU</span>
            </div>
          </div>
          
          <p className="text-[10px] font-medium text-natural-muted px-4 leading-relaxed">
            Ao entrar, você concorda com nossos termos de uso e política de privacidade para médicos revalidandos.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function MailboxModal({ isOpen, onClose, mails, onRedeem, onRedeemAll }: { isOpen: boolean; onClose: () => void; mails: MailItem[]; onRedeem: (id: string) => void; onRedeemAll: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-natural-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-natural-50 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-white/20"
      >
        <div className="p-6 bg-white border-b border-natural-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-natural-900 text-white rounded-xl">
               <Mail size={20} />
             </div>
             <div>
               <h3 className="text-lg font-black uppercase tracking-tight text-natural-900">Mensagens</h3>
               <p className="text-[10px] font-bold text-natural-muted uppercase tracking-widest">{mails.length} novas</p>
             </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-natural-100 rounded-full transition-colors text-natural-400">
            <XCircle size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {mails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-natural-100 rounded-full flex items-center justify-center text-natural-300 mb-4">
                <Inbox size={32} />
              </div>
              <p className="text-xs font-black uppercase tracking-tight text-natural-900">Caixa de entrada vazia</p>
              <p className="text-[10px] font-medium text-natural-muted mt-1">Suas conquistas aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mails.map((mail, idx) => (
                <motion.div 
                  key={mail.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onRedeem(mail.id)}
                  className="p-4 cursor-pointer group bg-white hover:bg-natural-50 border border-natural-100 rounded-2xl transition-all"
                >
                  <div className="flex gap-4">
                    <div className="shrink-0 p-2 bg-natural-50 rounded-lg text-natural-600">
                      {mail.type === 'achievement' && <Award size={20} className="text-amber-500" />}
                      {mail.type === 'card' && <Star size={20} className="text-sky-500" />}
                      {mail.type === 'promotion' && <Crown size={20} className="text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-black uppercase tracking-wider opacity-60">
                          {mail.type === 'achievement' ? 'Conquista' : mail.type === 'card' ? 'Card' : 'Promoção'}
                        </span>
                        <span className="text-[9px] font-bold opacity-30">{new Date(mail.timestamp).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-tight truncate">{mail.title}</h4>
                      <p className="text-[10px] font-medium opacity-60 line-clamp-1 mt-0.5">{mail.message}</p>
                    </div>
                    <div className="shrink-0 flex items-center">
                       <Sparkles size={16} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {mails.length > 0 && (
          <div className="p-6 bg-white border-t border-natural-100">
            <button 
              onClick={onRedeemAll}
              className="w-full py-4 bg-natural-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              Resgatar Tudo <Sparkles size={16} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

