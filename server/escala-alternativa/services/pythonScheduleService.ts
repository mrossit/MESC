import { spawn } from "child_process";
import { join } from "path";
import { logger } from "../../utils/logger";

export interface PythonScheduleInput {
  users: any[];
  responses: any[];
}

export interface PythonScheduleResult {
  missa: string;
  ministro: string;
  ministro_id: string;
  preferido: boolean;
  atribuicoes_totais: number;
}

export interface PythonScheduleError {
  error: true;
  message: string;
  type: string;
}

/**
 * Serviço para executar o algoritmo alternativo de geração de escalas em Python
 */
export class PythonScheduleService {
  private scriptPath: string;

  constructor() {
    this.scriptPath = join(__dirname, "../scripts/gerar_escala.py");
  }

  /**
   * Executa o script Python de geração de escalas
   */
  async generateSchedule(
    input: PythonScheduleInput
  ): Promise<PythonScheduleResult[] | PythonScheduleError> {
    return new Promise((resolve, reject) => {
      try {
        // Spawn processo Python
        const pythonProcess = spawn("python3", [this.scriptPath]);

        let stdout = "";
        let stderr = "";

        // Capturar output
        pythonProcess.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        // Quando o processo terminar
        pythonProcess.on("close", (code) => {
          if (code !== 0) {
            logger.error(`Python script exited with code ${code}`);
            logger.error(`stderr: ${stderr}`);
            reject(new Error(`Python script failed: ${stderr}`));
            return;
          }

          try {
            // Parse do resultado JSON
            const result = JSON.parse(stdout);

            // Verificar se é um erro
            if (result.error) {
              logger.error(`Python script returned error: ${result.message}`);
              resolve(result as PythonScheduleError);
              return;
            }

            // Retornar resultado válido
            resolve(result as PythonScheduleResult[]);
          } catch (parseError: any) {
            logger.error(`Failed to parse Python output: ${parseError.message}`);
            logger.error(`stdout: ${stdout}`);
            reject(new Error(`Failed to parse Python output: ${parseError.message}`));
          }
        });

        // Erro ao spawnar processo
        pythonProcess.on("error", (error) => {
          logger.error(`Failed to start Python process: ${error.message}`);
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        // Enviar dados de entrada para o stdin do Python
        const inputJson = JSON.stringify(input);
        pythonProcess.stdin.write(inputJson);
        pythonProcess.stdin.end();

      } catch (error: any) {
        logger.error(`Error in generateSchedule: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Valida se o Python está disponível no sistema
   */
  async validatePythonAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const pythonCheck = spawn("python3", ["--version"]);
      
      pythonCheck.on("close", (code) => {
        resolve(code === 0);
      });

      pythonCheck.on("error", () => {
        resolve(false);
      });
    });
  }
}

export const pythonScheduleService = new PythonScheduleService();
