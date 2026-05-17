import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: '什么是 AAB 文件？',
    answer: 'AAB (Android App Bundle) 是 Google 推出的一种发布格式，用于优化应用分发。与传统 APK 相比，AAB 可以根据用户设备生成最优化的安装包，减小应用体积。',
  },
  {
    question: '什么是 APK 文件？',
    answer: 'APK (Android Package Kit) 是 Android 系统的安装包格式。用户可以直接安装 APK 文件到 Android 设备，无需通过应用商店。',
  },
  {
    question: '转换后的 APK 能否直接安装？',
    answer: '是的，转换后的 APK 是通用的安装包，可以直接在大多数 Android 设备上安装。请注意，在安装前需要在设置中开启"允许安装未知来源应用"。',
  },
  {
    question: '我的文件安全吗？',
    answer: '完全安全。我们不会在服务器上存储您的任何文件。所有转换过程都在您的浏览器中完成，文件仅用于本次转换。',
  },
  {
    question: '支持多大的文件？',
    answer: '目前支持最大 500MB 的 AAB 文件。如果您的文件超过此限制，建议您使用 Android Studio 的 bundletool 工具进行转换。',
  },
  {
    question: '转换需要多长时间？',
    answer: '转换时间取决于文件大小和网络速度。一般来说，小型应用在几秒钟内即可完成转换。',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              常见问题
            </span>
          </h2>
          <p className="text-slate-400">
            遇到问题？这里可能有您想要的答案
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <span className="font-medium text-white">{faq.question}</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 pl-14 text-slate-400">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
