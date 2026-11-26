import { Button, Result } from 'antd';
import { useRouteError } from 'react-router-dom';

export function RouteError() {
  const error = useRouteError();
  const resourceError =
    error instanceof Error &&
    /dynamically imported module|Importing a module script|Loading chunk|Unable to preload CSS/i.test(
      error.message,
    );
  return (
    <main className="page" role="alert">
      <Result
        status="warning"
        title={resourceError ? '页面资源加载失败' : '页面暂时无法显示'}
        subTitle={
          resourceError
            ? '页面可能已更新，或网络连接中断。请刷新后重试。后台研究任务会继续运行。'
            : '请刷新后重试。后台研究任务会继续运行。'
        }
        extra={<Button onClick={() => window.location.reload()}>刷新页面</Button>}
      />
    </main>
  );
}
