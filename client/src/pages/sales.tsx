import { motion } from "framer-motion";
import { Link } from "wouter";
import { 
  Check, 
  Zap, 
  Shield, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Clock, 
  Headphones,
  ChevronRight,
  Star,
  Sparkles,
  ArrowRight,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState } from "react";

const features = [
  {
    icon: Users,
    title: "Gestão de Clientes",
    description: "Cadastre e gerencie todos os seus clientes IPTV em um só lugar, com histórico completo."
  },
  {
    icon: MessageSquare,
    title: "Automação WhatsApp",
    description: "Envie cobranças automáticas e lembretes de vencimento via WhatsApp."
  },
  {
    icon: BarChart3,
    title: "Relatórios Completos",
    description: "Acompanhe métricas de faturamento, renovações e crescimento do seu negócio."
  },
  {
    icon: Clock,
    title: "Cobranças Automáticas",
    description: "Configure horários de cobrança e deixe o sistema trabalhar por você."
  },
  {
    icon: Shield,
    title: "Segurança Total",
    description: "Seus dados protegidos com criptografia de ponta e backups automáticos."
  },
  {
    icon: Headphones,
    title: "Suporte VIP 24/7",
    description: "Equipe dedicada para ajudar você a qualquer momento, todos os dias."
  }
];

const plans = [
  {
    name: "Mensal",
    price: "60",
    period: "/mês",
    popular: false,
    features: [
      "Clientes ilimitados",
      "1 Instância WhatsApp",
      "Cobranças automáticas",
      "Todas as funcionalidades",
      "Relatórios personalizados",
      "Suporte VIP 24/7",
      "Consultoria gratuita"
    ]
  },
  {
    name: "Trimestral",
    price: "150",
    period: "/trimestre",
    popular: true,
    features: [
      "Clientes ilimitados",
      "1 Instância WhatsApp",
      "Cobranças automáticas",
      "Todas as funcionalidades",
      "Relatórios personalizados",
      "Suporte VIP 24/7",
      "Consultoria gratuita"
    ]
  },
  {
    name: "Anual",
    price: "590",
    period: "/ano",
    popular: false,
    features: [
      "Clientes ilimitados",
      "1 Instância WhatsApp",
      "Cobranças automáticas",
      "Todas as funcionalidades",
      "Relatórios personalizados",
      "Suporte VIP 24/7",
      "Consultoria gratuita"
    ]
  }
];

const faqs = [
  {
    question: "Como funciona o período de teste?",
    answer: "Você tem 7 dias para testar todas as funcionalidades do sistema gratuitamente. Não é necessário cartão de crédito para começar."
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim! Você pode cancelar sua assinatura a qualquer momento, sem multas ou taxas adicionais."
  },
  {
    question: "Como funciona a integração com WhatsApp?",
    answer: "Conectamos sua conta do WhatsApp ao sistema via QR Code. A partir daí, todas as cobranças são enviadas automaticamente."
  },
  {
    question: "Quantos clientes posso cadastrar?",
    answer: "Não há limite! Todos os planos oferecem cadastro de clientes ilimitados."
  },
  {
    question: "Preciso de conhecimento técnico?",
    answer: "Não! O Loopag foi desenvolvido para ser simples e intuitivo. Qualquer pessoa consegue usar."
  },
  {
    question: "Como funciona o suporte?",
    answer: "Oferecemos suporte VIP 24/7 via WhatsApp e email. Nossa equipe está sempre pronta para ajudar."
  }
];

export default function SalesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#1a1a3a] to-[#0a0a1a]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <a href="#" data-testid="link-nav-home" className="flex items-center gap-2 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Loopag
                </span>
              </a>
            </motion.div>
            
            {/* Desktop Navigation */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden sm:flex items-center gap-4"
            >
              <a href="#planos" data-testid="link-nav-planos" className="text-gray-400 hover:text-white transition-colors text-sm">
                Planos
              </a>
              <Link href="/login" data-testid="link-nav-login">
                <Button 
                  data-testid="button-nav-login"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-blue-500/25"
                >
                  Acessar Sistema
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </motion.div>

            {/* Mobile Menu Button */}
            <button
              data-testid="button-mobile-menu"
              className="sm:hidden p-2 text-gray-400 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="sm:hidden py-4 border-t border-white/5"
            >
              <div className="flex flex-col gap-3">
                <a 
                  href="#planos" 
                  data-testid="link-mobile-planos"
                  className="text-gray-400 hover:text-white transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Planos
                </a>
                <Link href="/login" data-testid="link-mobile-login">
                  <Button 
                    data-testid="button-mobile-login"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0"
                  >
                    Acessar Sistema
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-sm text-blue-300 mb-6">
                <Sparkles className="w-4 h-4" />
                Sistema completo de gestão IPTV
              </span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            >
              Gerencie suas{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                assinaturas IPTV
              </span>{" "}
              de forma inteligente
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto"
            >
              Automatize cobranças, gerencie clientes e acompanhe seu faturamento em tempo real. 
              Tudo em uma única plataforma moderna e fácil de usar.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/login" data-testid="link-hero-start">
                <Button 
                  data-testid="button-hero-start"
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0 shadow-xl shadow-blue-500/25 px-8 py-6 text-lg"
                >
                  Começar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="#planos" data-testid="link-hero-plans">
                <Button 
                  data-testid="button-hero-plans"
                  size="lg" 
                  variant="outline"
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-white px-8 py-6 text-lg"
                >
                  Ver Planos
                </Button>
              </a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-6 mt-12 text-gray-500 text-sm"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span>Dados Seguros</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span>+500 Revendedores</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-400" />
                <span>7 dias grátis</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-blue-400 text-sm font-medium uppercase tracking-wider">Funcionalidades</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
              Ferramentas poderosas para automatizar seu negócio e aumentar sua produtividade
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-white/10 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-purple-400 text-sm font-medium uppercase tracking-wider">Planos</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-4">
              Escolha o plano ideal para você
            </h2>
            <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
              Comece gratuitamente e faça upgrade quando precisar. Todos os planos incluem 7 dias de teste grátis.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative p-6 lg:p-8 rounded-2xl border transition-all duration-300 ${
                  plan.popular 
                    ? "bg-gradient-to-b from-blue-500/10 to-purple-500/10 border-blue-500/30 scale-105 shadow-xl shadow-blue-500/10" 
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium shadow-lg">
                      Mais Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-4">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-gray-400">R$</span>
                    <span className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      {plan.price}
                    </span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-gray-300 text-sm">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/login" data-testid={`link-plan-${plan.name.toLowerCase()}`}>
                  <Button 
                    data-testid={`button-plan-${plan.name.toLowerCase()}`}
                    className={`w-full py-6 ${
                      plan.popular 
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25" 
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                    }`}
                  >
                    Começar Agora
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-blue-400 text-sm font-medium uppercase tracking-wider">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-4">
              Perguntas Frequentes
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={faq.question} 
                  value={`faq-${index}`}
                  className="rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 px-6 data-[state=open]:border-blue-500/30"
                >
                  <AccordionTrigger 
                    data-testid={`faq-toggle-${index}`}
                    className="text-left text-lg font-semibold py-6 hover:no-underline text-white"
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 text-sm pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center p-8 lg:p-12 rounded-3xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-blue-500/20"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Pronto para automatizar seu negócio?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Junte-se a centenas de revendedores que já transformaram a gestão de suas assinaturas IPTV.
            </p>
            <Link href="/login" data-testid="link-cta-start">
              <Button 
                data-testid="button-cta-start"
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0 shadow-xl shadow-blue-500/25 px-8 py-6 text-lg"
              >
                Começar Teste Grátis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-gray-500 text-sm mt-4">
              7 dias grátis • Sem cartão de crédito • Cancele quando quiser
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Loopag
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2024 Loopag. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
