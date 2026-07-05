export const easeOutExpo = [0.22, 1, 0.36, 1]

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.4, ease: easeOutExpo },
}

export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 14 },
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

export const staggerItem = fadeUp

export const cardHover = {
  whileHover: { y: -4, transition: { duration: 0.2, ease: easeOutExpo } },
}

export const buttonPress = {
  whileTap: { scale: 0.97, transition: { duration: 0.15, ease: easeOutExpo } },
}
