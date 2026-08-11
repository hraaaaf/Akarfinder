type ContainerProps = {
  children: React.ReactNode;
  className?: string;
  fluid?: boolean;
};

export function Container({ children, className = "", fluid = false }: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full ${
        fluid ? "max-w-none px-4 sm:px-6" : "max-w-7xl px-5 sm:px-6 lg:px-8"
      } ${className}`.trim()}
    >
      {children}
    </div>
  );
}
